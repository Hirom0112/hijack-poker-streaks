/**
 * Integration test (CLAUDE.md §3 adapted scope) — supertest against the real
 * Express `app` + live DynamoDB Local (localhost:8000, env in jest.setup.ts) for
 * `GET /api/v1/player/streaks/badges` and its alias.
 *
 * Badges are a pure read-only PROJECTION, so there is nothing to mutate — we
 * seed a player aggregate (best-ever streaks) + reward rows via raw docClient
 * puts (a test-only seed; Inv 6 is about app code, not fixtures) and assert the
 * derived §4.10 shape:
 *   1. fresh/never-seen player → all 12 rungs earned=false, earnedAt=null;
 *   2. seeded bestLoginStreak=14 → login 3/7/14 earned, 30/60/90 not; a 7-day
 *      login reward row surfaces earnedAt on the 7-rung; the play axis stays
 *      all-false;
 *   3. the `/api/v1/streaks/badges` alias returns the SAME body;
 *   4. no auth → 401.
 * Unique random playerId per run so reruns never collide.
 */
import request from 'supertest';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

import { app } from '../../handler';
import { docClient } from '../../shared/config/dynamo';
import { nowIso } from '../../src/lib/utc';
import type { PlayerStreak, RewardRecord } from '../../src/domain/types';

const PLAYERS_TABLE = process.env.STREAKS_PLAYERS_TABLE ?? 'streaks-players';
const REWARDS_TABLE = process.env.STREAKS_REWARDS_TABLE ?? 'streaks-rewards';

const PLAYER_ID = `test-badges-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const FRESH_ID = `test-badges-fresh-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

async function seedPlayer(playerId: string, bestLogin: number, bestPlay: number): Promise<void> {
  const player: PlayerStreak = {
    playerId,
    loginStreak: 0,
    playStreak: 0,
    bestLoginStreak: bestLogin,
    bestPlayStreak: bestPlay,
    lastLoginDate: null,
    lastPlayDate: null,
    freezesAvailable: 0,
    freezesUsedThisMonth: 0,
    lastFreezeGrantDate: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await docClient.send(new PutCommand({ TableName: PLAYERS_TABLE, Item: player }));
}

async function seedReward(
  playerId: string,
  type: RewardRecord['type'],
  milestone: number,
  createdAt: string,
): Promise<void> {
  const reward = {
    playerId,
    rewardId: `${createdAt}-${type}-${milestone}`,
    type,
    milestone,
    points: 150,
    streakCount: milestone,
    createdAt,
    pointTxnType: 'streak_bonus',
    notification: {
      title: `${milestone}-day streak!`,
      body: 'seed',
      deepLink: 'hijackpoker://streaks',
      milestone,
      type,
    },
  };
  await docClient.send(new PutCommand({ TableName: REWARDS_TABLE, Item: reward }));
}

describe('integration — GET …/streaks/badges (derived projection)', () => {
  it('never-seen player → 200 with all 12 rungs earned=false, earnedAt=null', async () => {
    const res = await request(app)
      .get('/api/v1/player/streaks/badges')
      .set('X-Player-Id', FRESH_ID);

    expect(res.status).toBe(200);
    expect(res.body.login).toHaveLength(6);
    expect(res.body.play).toHaveLength(6);
    expect(res.body.login.every((b: { earned: boolean }) => b.earned === false)).toBe(true);
    expect(res.body.play.every((b: { earned: boolean }) => b.earned === false)).toBe(true);
    expect(res.body.login[0]).toEqual({
      milestone: 3,
      name: 'Greenhorn',
      tier: 'tin',
      earned: false,
      earnedAt: null,
    });
  });

  it('bestLoginStreak=14 + a 7-day reward row → 3/7/14 earned, earnedAt on the 7-rung', async () => {
    await seedPlayer(PLAYER_ID, 14, 0);
    await seedReward(PLAYER_ID, 'login_milestone', 7, '2026-02-13T08:03:55.000Z');

    const res = await request(app)
      .get('/api/v1/player/streaks/badges')
      .set('X-Player-Id', PLAYER_ID);

    expect(res.status).toBe(200);
    expect(res.body.login.map((b: { earned: boolean }) => b.earned)).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
    expect(res.body.play.every((b: { earned: boolean }) => b.earned === false)).toBe(true);

    const login7 = res.body.login.find((b: { milestone: number }) => b.milestone === 7);
    expect(login7).toMatchObject({
      name: 'Deputy',
      tier: 'copper',
      earned: true,
      earnedAt: '2026-02-13T08:03:55.000Z',
    });
    // earned but no reward row → earnedAt null
    expect(res.body.login.find((b: { milestone: number }) => b.milestone === 14)).toMatchObject({
      earned: true,
      earnedAt: null,
    });
  });

  it('the /api/v1/streaks/badges alias returns the same body', async () => {
    const canonical = await request(app)
      .get('/api/v1/player/streaks/badges')
      .set('X-Player-Id', PLAYER_ID);
    const alias = await request(app)
      .get('/api/v1/streaks/badges')
      .set('X-Player-Id', PLAYER_ID);

    expect(alias.status).toBe(200);
    expect(alias.body).toEqual(canonical.body);
  });

  it('no X-Player-Id → 401', async () => {
    const res = await request(app).get('/api/v1/player/streaks/badges');
    expect(res.status).toBe(401);
  });
});
