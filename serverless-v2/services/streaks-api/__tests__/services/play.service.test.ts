import { applyHandCompleted } from '../../src/services/play.service';
import { applyLoginCheckIn } from '../../src/services/streak.service';
import type { PlayerStreak } from '../../src/domain/types';

/**
 * Pure-logic unit tests for the play streak service (CLAUDE.md §3 strict
 * scope, mirrors streak.service). `applyHandCompleted` takes the loaded player
 * record + the HAND's UTC day and that day's yesterday (both computed once at
 * the edge from `completedAt`, NOT now — Inv 1, spec §Edge 1) and returns the
 * new state + the activity merge. It performs NO DynamoDB IO (Inv 6).
 *
 * The play axis is independent of the login axis (FR-1.3).
 */

const DAY = '2026-02-20';
const PRIOR = '2026-02-19';

/** A fully-populated existing player record; override per test. */
function existingPlayer(overrides: Partial<PlayerStreak>): PlayerStreak {
  return {
    playerId: 'p1',
    loginStreak: 0,
    playStreak: 0,
    bestLoginStreak: 0,
    bestPlayStreak: 0,
    lastLoginDate: null,
    lastPlayDate: null,
    freezesAvailable: 0,
    freezesUsedThisMonth: 0,
    lastFreezeGrantDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('play.service — applyHandCompleted', () => {
  it('first hand of day (new player, no record) → playStreak=1, activity played, day=hand day', () => {
    const result = applyHandCompleted(null, 'p1', DAY, PRIOR);

    expect(result.playStreakUpdated).toBe(true);
    expect(result.player.playStreak).toBe(1);
    expect(result.player.bestPlayStreak).toBe(1);
    expect(result.player.lastPlayDate).toBe(DAY);
    expect(result.activity).not.toBeNull();
    expect(result.activity).toMatchObject({
      playerId: 'p1',
      date: DAY, // the HAND's UTC day, not now
      played: true,
      playStreakAtDay: 1,
    });
  });

  it('first hand of day (existing player, lastPlayDate=yesterday, playStreak=2) → playStreak=3', () => {
    const player = existingPlayer({
      playStreak: 2,
      bestPlayStreak: 2,
      lastPlayDate: PRIOR,
    });
    const result = applyHandCompleted(player, 'p1', DAY, PRIOR);

    expect(result.playStreakUpdated).toBe(true);
    expect(result.player.playStreak).toBe(3);
    expect(result.player.bestPlayStreak).toBe(3);
    expect(result.player.lastPlayDate).toBe(DAY);
    expect(result.activity?.playStreakAtDay).toBe(3);
    expect(result.activity?.played).toBe(true);
  });

  it('multiple hands same day (lastPlayDate===day) → playStreakUpdated=false, no-op', () => {
    const player = existingPlayer({
      playStreak: 3,
      bestPlayStreak: 3,
      lastPlayDate: DAY,
    });
    const result = applyHandCompleted(player, 'p1', DAY, PRIOR);

    expect(result.playStreakUpdated).toBe(false);
    expect(result.player.playStreak).toBe(3);
    expect(result.activity).toBeNull();
  });

  it('missed day reset (lastPlayDate=2 days ago, no freeze) → playStreak=1, streakBroken on play axis', () => {
    const player = existingPlayer({
      playStreak: 5,
      bestPlayStreak: 5,
      lastPlayDate: '2026-02-18', // 2 days before DAY
      freezesAvailable: 0,
    });
    const result = applyHandCompleted(player, 'p1', DAY, PRIOR);

    expect(result.playStreakUpdated).toBe(true);
    expect(result.player.playStreak).toBe(1);
    expect(result.player.bestPlayStreak).toBe(5); // best preserved
    expect(result.activity?.playStreakAtDay).toBe(1);
    expect(result.activity?.streakBroken).toBe(true);
    expect(result.activity?.played).toBe(true);
  });

  it('independence: a hand-completed advances playStreak but does NOT touch the login axis', () => {
    const player = existingPlayer({
      loginStreak: 7,
      bestLoginStreak: 7,
      lastLoginDate: '2026-02-15',
      playStreak: 2,
      bestPlayStreak: 2,
      lastPlayDate: PRIOR,
    });
    const result = applyHandCompleted(player, 'p1', DAY, PRIOR);

    expect(result.player.playStreak).toBe(3);
    // Login axis untouched (FR-1.3).
    expect(result.player.loginStreak).toBe(7);
    expect(result.player.bestLoginStreak).toBe(7);
    expect(result.player.lastLoginDate).toBe('2026-02-15');
  });

  it('independence: a login check-in does NOT touch the play axis', () => {
    const player = existingPlayer({
      loginStreak: 2,
      bestLoginStreak: 2,
      lastLoginDate: PRIOR,
      playStreak: 4,
      bestPlayStreak: 4,
      lastPlayDate: '2026-02-15',
    });
    const result = applyLoginCheckIn(player, 'p1', DAY, PRIOR);

    expect(result.player.loginStreak).toBe(3);
    // Play axis untouched (FR-1.3).
    expect(result.player.playStreak).toBe(4);
    expect(result.player.bestPlayStreak).toBe(4);
    expect(result.player.lastPlayDate).toBe('2026-02-15');
  });
});
