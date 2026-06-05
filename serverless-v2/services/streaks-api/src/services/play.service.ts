/**
 * Play streak domain logic (CLAUDE.md §3 strict scope, Inv 6).
 *
 * PURE: mirrors `streak.service.ts` for the PLAY axis. No DynamoDB IO lives
 * here — the internal handler computes the hand's UTC day + that day's
 * yesterday once at the edge from `completedAt` (Inv 1, NOT now), loads the
 * player, calls this service, and the repository performs the conditional
 * writes (Inv 6).
 *
 * The play axis is fully independent of the login axis (FR-1.3): this function
 * only ever touches `playStreak`, `bestPlayStreak`, `lastPlayDate` (and the
 * shared `updatedAt`) — never the login fields.
 *
 * S2 covers the play axis only. Freeze evaluation (S4) and play-milestone
 * reward awarding (S3) are out of scope; the gap≥2 / no-freeze branch resets
 * to 1.
 */
import { nowIso } from '../lib/utc';
import type { ActivityDay, PlayerStreak } from '../domain/types';

/** The outcome of applying a completed hand to a player's state. */
export interface HandCompletedResult {
  /** The next player record to persist. */
  player: PlayerStreak;
  /**
   * The activity merge to write for the hand's day, or `null` when this is a
   * same-day repeat (no merge — the existing row is the idempotency record).
   */
  activity: ActivityDay | null;
  /** `true` only when THIS call advanced the play streak (first hand of the day). */
  playStreakUpdated: boolean;
}

/**
 * Apply a completed hand. `player` is the loaded record, or `null` for a
 * never-seen player (created with play streak 1, NOT 404). `day`/`yesterday`
 * are UTC `YYYY-MM-DD` strings derived from the hand's `completedAt` once at
 * the handler edge — the HAND's day, never now (Inv 1, spec §Edge 1).
 */
export function applyHandCompleted(
  player: PlayerStreak | null,
  playerId: string,
  day: string,
  yesterday: string,
): HandCompletedResult {
  const now = nowIso();

  // New player → first hand ever → play streak starts at 1.
  if (player === null) {
    return buildAdvance(newPlayer(playerId, now), playerId, 1, false, day, now);
  }

  // Same-day repeat: fast-path no-op. The activity row's create-or-merge
  // condition at the repository (pattern E) is the true idempotency source of
  // truth; this just short-circuits the math.
  if (player.lastPlayDate === day) {
    return { player, activity: null, playStreakUpdated: false };
  }

  // Decide the play transition.
  let nextPlay: number;
  let broken: boolean;
  if (player.lastPlayDate === yesterday) {
    nextPlay = player.playStreak + 1;
    broken = false;
  } else {
    // Gap ≥ 2 (or some prior date that is not yesterday) with no freeze in S2
    // ⇒ reset to 1 and mark the day as a streak break on the play axis.
    // (Freeze logic is S4.)
    nextPlay = 1;
    broken = true;
  }

  return buildAdvance(player, playerId, nextPlay, broken, day, now);
}

/**
 * Build the advanced player + the day's activity merge. Only the play-axis
 * fields are mutated (FR-1.3); login fields are carried through untouched from
 * `base`.
 */
function buildAdvance(
  base: PlayerStreak,
  playerId: string,
  nextPlay: number,
  broken: boolean,
  day: string,
  now: string,
): HandCompletedResult {
  const player: PlayerStreak = {
    ...base,
    playerId,
    playStreak: nextPlay,
    bestPlayStreak: Math.max(base.bestPlayStreak, nextPlay),
    lastPlayDate: day,
    updatedAt: now,
  };
  const activity: ActivityDay = {
    playerId,
    date: day,
    loggedIn: base.lastLoginDate === day,
    played: true,
    freezeUsed: false,
    streakBroken: broken,
    loginStreakAtDay: base.loginStreak,
    playStreakAtDay: nextPlay,
    timestamp: now,
  };
  return { player, activity, playStreakUpdated: true };
}

/** A zero-state player record for a never-seen player. */
function newPlayer(playerId: string, now: string): PlayerStreak {
  return {
    playerId,
    loginStreak: 0,
    playStreak: 0,
    bestLoginStreak: 0,
    bestPlayStreak: 0,
    lastLoginDate: null,
    lastPlayDate: null,
    freezesAvailable: 0,
    freezesUsedThisMonth: 0,
    lastFreezeGrantDate: null,
    createdAt: now,
    updatedAt: now,
  };
}
