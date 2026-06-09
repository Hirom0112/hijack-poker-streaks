/**
 * GET /api/v1/player/streaks/badges (API_CONTRACT.md §4.10) — the player's badge
 * shelf: both axes, every rung, earned/unearned, for the dashboard badge UI.
 *
 * THIN handler (Inv 6): HTTP only. It loads the player aggregate (for the
 * best-ever streaks) and the reward rows (the existing `queryRewards` — a single
 * `Query`, newest-first, NEVER a `Scan`, NFR-8) and hands both to the pure
 * `buildBadges` service, which derives the §4.10 `{ login[], play[] }` shape.
 * No `docClient` here, no derivation logic here.
 *
 * Badges are a pure READ-ONLY projection — this endpoint writes nothing and adds
 * no table. A never-seen player returns the all-unearned shape as 200 (best
 * streaks default to 0), NEVER 404.
 */
import type { Request, Response } from 'express';

import { getPlayer, queryRewards } from '../repositories/dynamo.repository';
import { buildBadges } from '../services/badge.service';
import { UnauthorizedError } from '../middleware/error';

export async function getBadgesHandler(req: Request, res: Response): Promise<void> {
  const playerId = req.playerId;
  if (playerId === undefined) {
    throw new UnauthorizedError();
  }
  // A repository / DynamoDB failure rejects here → asyncHandler → 500 (A-3).
  const [player, rewards] = await Promise.all([getPlayer(playerId), queryRewards(playerId)]);
  const bestLoginStreak = player?.bestLoginStreak ?? 0;
  const bestPlayStreak = player?.bestPlayStreak ?? 0;
  res.status(200).json(buildBadges(bestLoginStreak, bestPlayStreak, rewards));
}
