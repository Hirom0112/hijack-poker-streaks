/**
 * Badge-service unit tests (CLAUDE.md §3 strict scope) — the DERIVED, read-only
 * badges projection. PURE logic: given the player's best-ever streaks and the
 * reward rows, build the §4.10 `{ login[], play[] }` response. No DynamoDB IO
 * here (the handler owns the player + reward reads).
 *
 * RULES under test:
 *  - `earned = (axis best-ever streak) >= milestone` — PERMANENT, never resets
 *    when the current streak breaks (best streaks are monotonic).
 *  - Each axis returns ALL SIX rungs, milestone-ascending, with the exact
 *    name/tier from the BADGE_LADDER single source of truth.
 *  - `earnedAt = createdAt of the EARLIEST matching reward row` for that
 *    axis+milestone, or `null` when no row exists.
 */
import { buildBadges } from '../../src/services/badge.service';
import type { RewardRecord } from '../../src/domain/types';

/** A minimal reward row (only the fields the badge derivation reads). */
function reward(
  type: RewardRecord['type'],
  milestone: number,
  createdAt: string,
): RewardRecord {
  return {
    rewardId: `r-${type}-${milestone}-${createdAt}`,
    type,
    milestone,
    points: 0,
    streakCount: milestone,
    createdAt,
    notification: {
      title: '',
      body: '',
      deepLink: 'hijackpoker://streaks',
      milestone,
      type,
    },
  };
}

describe('badge.service — buildBadges (earned derivation)', () => {
  it('bestLoginStreak=14 ⇒ login rungs 3,7,14 earned; 30,60,90 not — exact names/tiers', () => {
    const res = buildBadges(14, 0, []);

    expect(res.login).toEqual([
      { milestone: 3, name: 'Greenhorn', tier: 'tin', earned: true, earnedAt: null },
      { milestone: 7, name: 'Deputy', tier: 'copper', earned: true, earnedAt: null },
      { milestone: 14, name: 'Sheriff', tier: 'bronze', earned: true, earnedAt: null },
      { milestone: 30, name: 'Marshal', tier: 'silver', earned: false, earnedAt: null },
      { milestone: 60, name: 'Ranger Captain', tier: 'gold', earned: false, earnedAt: null },
      { milestone: 90, name: 'Frontier Legend', tier: 'platinum', earned: false, earnedAt: null },
    ]);
  });

  it('bestPlayStreak=0 ⇒ all six play badges earned=false — exact names/tiers', () => {
    const res = buildBadges(0, 0, []);

    expect(res.play).toEqual([
      { milestone: 3, name: 'Anted In', tier: 'tin', earned: false, earnedAt: null },
      { milestone: 7, name: 'Card Sharp', tier: 'copper', earned: false, earnedAt: null },
      { milestone: 14, name: "Dead Man's Hand", tier: 'bronze', earned: false, earnedAt: null },
      { milestone: 30, name: 'Quick Draw', tier: 'silver', earned: false, earnedAt: null },
      { milestone: 60, name: 'High Roller', tier: 'gold', earned: false, earnedAt: null },
      { milestone: 90, name: 'Royal Flush', tier: 'platinum', earned: false, earnedAt: null },
    ]);
  });

  it('bestLoginStreak=90 ⇒ all six login badges earned=true', () => {
    const res = buildBadges(90, 0, []);

    expect(res.login.map((b) => b.earned)).toEqual([true, true, true, true, true, true]);
    // exact rung ordering preserved
    expect(res.login.map((b) => b.milestone)).toEqual([3, 7, 14, 30, 60, 90]);
  });

  it('earned axis is independent: bestLoginStreak=90 does NOT earn any play badge', () => {
    const res = buildBadges(0, 90, []);
    expect(res.login.map((b) => b.earned)).toEqual([false, false, false, false, false, false]);
    expect(res.play.map((b) => b.earned)).toEqual([true, true, true, true, true, true]);
  });

  it('earnedAt is populated from the matching reward row (per axis+milestone)', () => {
    const rewards: RewardRecord[] = [
      reward('login_milestone', 7, '2026-02-13T08:03:55.000Z'),
      reward('play_milestone', 3, '2026-02-09T19:42:11.000Z'),
    ];
    const res = buildBadges(7, 3, rewards);

    const login7 = res.login.find((b) => b.milestone === 7);
    expect(login7).toMatchObject({ earned: true, earnedAt: '2026-02-13T08:03:55.000Z' });

    const play3 = res.play.find((b) => b.milestone === 3);
    expect(play3).toMatchObject({ earned: true, earnedAt: '2026-02-09T19:42:11.000Z' });

    // a login rung with no matching reward row → earnedAt null even if earned
    const login3 = res.login.find((b) => b.milestone === 3);
    expect(login3).toMatchObject({ earned: true, earnedAt: null });
  });

  it('earnedAt is null when no reward row matches that axis+milestone', () => {
    const rewards: RewardRecord[] = [reward('login_milestone', 7, '2026-02-13T08:03:55.000Z')];
    const res = buildBadges(14, 0, rewards);

    // 14 is earned by best streak but has no reward row → earnedAt null
    expect(res.login.find((b) => b.milestone === 14)).toMatchObject({
      earned: true,
      earnedAt: null,
    });
    // the play axis has no rows at all
    expect(res.play.every((b) => b.earnedAt === null)).toBe(true);
  });

  it('earnedAt picks the EARLIEST matching reward when an axis+milestone has several (re-award after reset)', () => {
    const rewards: RewardRecord[] = [
      reward('login_milestone', 7, '2026-03-01T10:00:00.000Z'),
      reward('login_milestone', 7, '2026-02-13T08:03:55.000Z'), // earlier
      reward('login_milestone', 7, '2026-02-20T09:00:00.000Z'),
    ];
    const res = buildBadges(7, 0, rewards);
    expect(res.login.find((b) => b.milestone === 7)).toMatchObject({
      earned: true,
      earnedAt: '2026-02-13T08:03:55.000Z',
    });
  });

  it('a reward row whose milestone is not on the ladder is ignored (no crash)', () => {
    const rewards: RewardRecord[] = [reward('login_milestone', 999, '2026-01-01T00:00:00.000Z')];
    const res = buildBadges(0, 0, rewards);
    expect(res.login).toHaveLength(6);
    expect(res.login.every((b) => b.earnedAt === null)).toBe(true);
  });
});
