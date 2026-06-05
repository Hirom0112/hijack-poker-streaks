/**
 * POST /api/v1/player/streaks/check-in (FR-5.2, NFR-2) — record today's login.
 *
 * THIN handler (Inv 6): computes today/yesterday ONCE at the edge (Inv 1),
 * loads the player, calls the pure streak service, then persists via the
 * repository's conditional writes. No `docClient` here, no streak math here.
 *
 * Idempotency: the activity row's `attribute_not_exists(#date)` write is the
 * source of truth (Inv 2). A same-day repeat is a 200 no-op (streakAdvanced
 * false), never a 409.
 *
 * S1 wires `freezeConsumed: false` (freeze is S4) and `milestoneEarned: null`
 * (reward awarding is S3).
 */
import type { Request, Response } from 'express';

import {
  advanceLoginStreak,
  awardMilestone,
  consumeFreeze,
  createPlayer,
  getPlayer,
  grantMonthlyFreeze,
  putActivity,
  resetLoginStreak,
} from '../repositories/dynamo.repository';
import { applyLoginCheckIn } from '../services/streak.service';
import { evaluateFreeze, type FreezeDecision } from '../services/freeze.service';
import { detectMilestone } from '../services/reward.service';
import { toStreaksResponse, zeroStreaksResponse } from './presenter';
import { nowIso, utcDay, yearMonth, yesterday as priorDay } from '../lib/utc';
import { logger } from '../../shared/config/logger';
import type { CheckInResponse, PlayerStreak, RewardRecord } from '../domain/types';

export async function checkInHandler(req: Request, res: Response): Promise<void> {
  const playerId = req.playerId;
  if (playerId === undefined) {
    res.status(401).json({ error: 'Unauthorized', message: 'X-Player-Id header is required' });
    return;
  }

  // Day-math computed once at the edge (Inv 1).
  const now = nowIso();
  const today = utcDay(now);
  const yesterday = priorDay(today);

  try {
    const existing = await getPlayer(playerId);

    // Same-day repeat → idempotent 200 no-op (no write).
    if (existing !== null && existing.lastLoginDate === today) {
      res.status(200).json(noOpResponse(playerId, existing));
      return;
    }

    // Lazy freeze evaluation runs FIRST (Inv 5, ARCHITECTURE §5c): grant the
    // monthly free freeze if due, then detect a missed day and consume a freeze
    // if it protects — BEFORE the streak transition decides advance vs reset.
    const freeze =
      existing !== null ? evaluateFreeze(existing, existing.lastLoginDate, today) : null;
    let protectedByFreeze = false;
    if (freeze !== null && existing !== null) {
      // (1) Monthly grant (idempotent per YYYY-MM).
      if (freeze.grantedMonthly) {
        await grantMonthlyFreeze({
          playerId,
          newFreezesAvailable: existing.freezesAvailable + 1,
          yearMonth: yearMonth(today),
          now,
        });
      }
      // (2) Consume one freeze to protect the single missed day. The transaction
      // covers BOTH axes (it only touches the shared freeze balance + the missed
      // day's row); the play axis reads the same protection on its next event.
      if (freeze.freezeConsumed && freeze.missedDate !== undefined && freeze.freezeSource !== undefined) {
        protectedByFreeze = await consumeFreeze({
          playerId,
          missedDate: freeze.missedDate,
          source: freeze.freezeSource,
          newFreezesAvailable: freeze.newFreezesAvailable,
          newFreezesUsedThisMonth: freeze.newFreezesUsedThisMonth,
          now,
        });
      }
    }

    // (3) THEN the streak transition, on the possibly-protected state.
    const result = applyLoginCheckIn(existing, playerId, today, yesterday, protectedByFreeze);
    // Fold the post-grant/post-consume freeze balances onto the player so the
    // response (and any persisted record) reflects the freeze decision.
    applyFreezeToPlayer(result.player, freeze, protectedByFreeze);
    // The service only returns streakAdvanced:false for the same-day path,
    // already handled above; here it is always an advancing result.
    if (result.activity === null) {
      res.status(200).json(noOpResponse(playerId, result.player));
      return;
    }
    result.activity.freezeUsed = protectedByFreeze;

    // The conditional advance must match the REAL prior date: on a protected
    // advance that is the missed-gap `lastLoginDate`, not yesterday.
    const expectedLastLoginDate =
      protectedByFreeze && existing !== null ? existing.lastLoginDate ?? undefined : undefined;

    // Did this advance land exactly on a milestone rung? (Reset → 1 and a new
    // player's first → 1 are never rungs, so this is null on those paths.)
    const reward = detectMilestone('login_milestone', result.player.loginStreak, now);

    if (reward !== null) {
      // Milestone crossing → ONE atomic TransactWriteCommand (Inv 4): player
      // Update + activity Put + reward Put. The activity Put's
      // attribute_not_exists(#date) inside the transaction is the idempotency
      // gate; a racing duplicate cancels the whole transaction → no-op.
      const committed = await awardMilestone({
        player: {
          playerId,
          axis: 'login',
          isNewPlayer: existing === null,
          date: today,
          // On a protected advance the award's conditional Update must match the
          // REAL prior `lastLoginDate` (the missed-gap date), not yesterday.
          yesterday: expectedLastLoginDate ?? yesterday,
          loginStreak: result.player.loginStreak,
          bestLoginStreak: result.player.bestLoginStreak,
        },
        activity: result.activity,
        reward,
        now,
      });
      if (!committed) {
        const current = (await getPlayer(playerId)) ?? result.player;
        res.status(200).json(noOpResponse(playerId, current));
        return;
      }
      logger.info('check-in awarded login milestone', {
        playerId,
        milestone: reward.milestone,
        points: reward.points,
        rewardId: reward.rewardId,
      });
      res.status(200).json(advancedResponse(playerId, result.player, reward, protectedByFreeze));
      return;
    }

    // Non-milestone advance (the common case) → cheap plain conditional writes.
    // Activity write is the idempotency gate (Inv 2). If the row already exists
    // (a racing duplicate beat us), treat as a same-day no-op and return the
    // current state rather than double-advancing.
    const firstToday = await putActivity(result.activity);
    if (!firstToday) {
      const current = (await getPlayer(playerId)) ?? result.player;
      res.status(200).json(noOpResponse(playerId, current));
      return;
    }

    await persistPlayer(existing, result.player, today, yesterday, now, expectedLastLoginDate);

    res.status(200).json(advancedResponse(playerId, result.player, null, protectedByFreeze));
  } catch (err) {
    logger.error('check-in failed', { playerId, err });
    res.status(500).json({ error: 'InternalError', message: 'Check-in failed' });
  }
}

/**
 * Fold the freeze decision's post-grant/post-consume balances onto the player
 * record so the response reflects them. The streak service carries the freeze
 * fields through untouched (it owns the login axis only); this is the single
 * place the freeze balances are reconciled onto the outgoing player.
 */
function applyFreezeToPlayer(
  player: PlayerStreak,
  freeze: FreezeDecision | null,
  protectedByFreeze: boolean,
): void {
  if (freeze === null) {
    return;
  }
  // Always reflect the monthly grant. The consume's balance decrement only
  // applies when the consume transaction actually committed.
  if (protectedByFreeze) {
    player.freezesAvailable = freeze.newFreezesAvailable;
    player.freezesUsedThisMonth = freeze.newFreezesUsedThisMonth;
  } else if (freeze.grantedMonthly) {
    player.freezesAvailable = freeze.newFreezesAvailable + (freeze.freezeConsumed ? 1 : 0);
  }
  player.lastFreezeGrantDate = freeze.newLastFreezeGrantDate;
}

/**
 * Persist the advanced player record via the right conditional write.
 * `expectedLastLoginDate` overrides the advance condition's prior date on a
 * freeze-protected advance (the gap date, not yesterday).
 */
async function persistPlayer(
  existing: PlayerStreak | null,
  next: PlayerStreak,
  today: string,
  yesterday: string,
  now: string,
  expectedLastLoginDate?: string,
): Promise<void> {
  if (existing === null) {
    await createPlayer(next);
    return;
  }
  const common = {
    playerId: next.playerId,
    loginStreak: next.loginStreak,
    bestLoginStreak: next.bestLoginStreak,
    today,
    now,
  };
  if (existing.lastLoginDate === yesterday || expectedLastLoginDate !== undefined) {
    await advanceLoginStreak({ ...common, yesterday, expectedLastLoginDate });
  } else {
    await resetLoginStreak(common);
  }
}

/**
 * Build the advancing 200 response. `milestoneEarned` carries the reward ONLY
 * on the call that earned it (API_CONTRACT.md §4.2); a non-milestone advance
 * passes `null`.
 */
function advancedResponse(
  playerId: string,
  player: PlayerStreak,
  reward: RewardRecord | null,
  freezeConsumed: boolean,
): CheckInResponse {
  return {
    playerId,
    checkedInToday: true,
    streakAdvanced: true,
    freezeConsumed,
    streaks: toStreaksResponse(player),
    milestoneEarned: reward,
  };
}

/** Build a same-day no-op response from the current player state. */
function noOpResponse(playerId: string, player: PlayerStreak | null): CheckInResponse {
  return {
    playerId,
    checkedInToday: true,
    streakAdvanced: false,
    freezeConsumed: false,
    streaks: player === null ? zeroStreaksResponse() : toStreaksResponse(player),
    milestoneEarned: null,
  };
}
