/**
 * Badge derivation service (CLAUDE.md §3 strict scope, Inv 6).
 *
 * PURE: takes the player's best-ever streaks + the player's existing reward rows
 * and returns the §4.10 `{ login[], play[] }` badges view. No DynamoDB IO — the
 * handler loads the player (for bestLoginStreak/bestPlayStreak) and the rewards
 * (via the existing `queryRewards`) and calls this.
 *
 * Badges are a read-only PROJECTION; this service writes nothing and adds no
 * table. Each rung's `earned` flag is `bestStreak >= milestone` — PERMANENT,
 * because best-ever streaks are monotonic and never decrease when the current
 * streak breaks. `earnedAt` is recovered from the existing reward rows
 * (`createdAt` of the EARLIEST matching axis+milestone row), or `null` if no
 * reward row exists for that rung.
 */
import { BADGE_LADDER, type BadgeRung } from '../config/badges';
import type { Badge, BadgesResponse, RewardRecord } from '../domain/types';

/**
 * Build the badges response for a player.
 *
 * @param bestLoginStreak best-ever login streak (from the player record; 0 for a
 *   never-seen player).
 * @param bestPlayStreak best-ever play streak.
 * @param rewards the player's reward rows (from `queryRewards`); used only to
 *   recover each earned rung's `earnedAt`. Order-independent — we pick the
 *   earliest `createdAt` per axis+milestone.
 */
export function buildBadges(
  bestLoginStreak: number,
  bestPlayStreak: number,
  rewards: RewardRecord[],
): BadgesResponse {
  const earnedAtIndex = indexEarliestEarnedAt(rewards);
  return {
    login: BADGE_LADDER.login.map((rung) =>
      toBadge(rung, 'login_milestone', bestLoginStreak, earnedAtIndex),
    ),
    play: BADGE_LADDER.play.map((rung) =>
      toBadge(rung, 'play_milestone', bestPlayStreak, earnedAtIndex),
    ),
  };
}

/** Project one ladder rung into a derived `Badge`. */
function toBadge(
  rung: BadgeRung,
  type: RewardRecord['type'],
  bestStreak: number,
  earnedAtIndex: Map<string, string>,
): Badge {
  const earned = bestStreak >= rung.milestone;
  return {
    milestone: rung.milestone,
    name: rung.name,
    tier: rung.tier,
    earned,
    earnedAt: earnedAtIndex.get(keyOf(type, rung.milestone)) ?? null,
  };
}

/**
 * Map each `axis+milestone` to the EARLIEST reward `createdAt` seen for it. A
 * re-award after a reset writes a second row for the same rung; the badge's
 * `earnedAt` is the FIRST time the rung was reached, so we keep the minimum
 * `createdAt` (lexicographic compare is correct for ISO-8601 UTC instants).
 */
function indexEarliestEarnedAt(rewards: RewardRecord[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const reward of rewards) {
    const key = keyOf(reward.type, reward.milestone);
    const existing = index.get(key);
    if (existing === undefined || reward.createdAt < existing) {
      index.set(key, reward.createdAt);
    }
  }
  return index;
}

/** Composite key for the earnedAt index. */
function keyOf(type: RewardRecord['type'], milestone: number): string {
  return `${type}:${milestone}`;
}
