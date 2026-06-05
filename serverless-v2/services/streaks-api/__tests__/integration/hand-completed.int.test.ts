/**
 * Integration test (CLAUDE.md §3 adapted scope for handlers): supertest against
 * the real Express `app` + live DynamoDB Local (localhost:8000, env set in
 * jest.setup.ts). Exercises the full hand-completed → play-streak flow and the
 * play/login independence (FR-1.3) end to end.
 *
 * The internal route is reachable ONLY via X-Internal-Secret (Inv 10, FR-6.3):
 * a missing secret, and an X-Player-Id-only request, both get 403.
 *
 * Each run uses a UNIQUE random playerId so reruns never collide with prior
 * rows (no teardown needed; rows are retained per DATA_MODEL.md §10).
 */

// The internal guard reads INTERNAL_API_SECRET at request time; set it before
// importing the app so the route is reachable with the matching header.
process.env.INTERNAL_API_SECRET ??= 'dev-internal-secret';
const SECRET = process.env.INTERNAL_API_SECRET;

import request from 'supertest';

import { app } from '../../handler';

const PLAYER_ID = `test-s2-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
// A fixed UTC instant so `date` is deterministic regardless of when the test runs.
const COMPLETED_AT = '2026-02-20T14:30:00Z';
const DATE = '2026-02-20';

describe('integration — hand-completed → play-streak read', () => {
  it('first hand (new player) → 200, playStreakUpdated:true, playStreak:1, date=hand day', async () => {
    const res = await request(app)
      .post('/internal/streaks/hand-completed')
      .set('X-Internal-Secret', SECRET as string)
      .set('Content-Type', 'application/json')
      .send({ playerId: PLAYER_ID, tableId: 456, handId: 'hand-1', completedAt: COMPLETED_AT });

    expect(res.status).toBe(200);
    expect(res.body.playerId).toBe(PLAYER_ID);
    expect(res.body.date).toBe(DATE);
    expect(res.body.playStreakUpdated).toBe(true);
    expect(res.body.playStreak).toBe(1);
    expect(res.body.milestoneEarned).toBeNull();
  });

  it('same UTC-day repeat hand → 200, playStreakUpdated:false (idempotent no-op)', async () => {
    const res = await request(app)
      .post('/internal/streaks/hand-completed')
      .set('X-Internal-Secret', SECRET as string)
      .set('Content-Type', 'application/json')
      .send({ playerId: PLAYER_ID, tableId: 456, handId: 'hand-2', completedAt: COMPLETED_AT });

    expect(res.status).toBe(200);
    expect(res.body.playStreakUpdated).toBe(false);
    expect(res.body.playStreak).toBe(1);
    expect(res.body.milestoneEarned).toBeNull();
  });

  it('missing X-Internal-Secret → 403 Forbidden', async () => {
    const res = await request(app)
      .post('/internal/streaks/hand-completed')
      .set('Content-Type', 'application/json')
      .send({ playerId: PLAYER_ID, tableId: 456, handId: 'hand-3', completedAt: COMPLETED_AT });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('X-Player-Id only (no secret) does NOT authorize → 403 (Inv 10)', async () => {
    const res = await request(app)
      .post('/internal/streaks/hand-completed')
      .set('X-Player-Id', PLAYER_ID)
      .set('Content-Type', 'application/json')
      .send({ playerId: PLAYER_ID, tableId: 456, handId: 'hand-4', completedAt: COMPLETED_AT });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('missing completedAt → 400', async () => {
    const res = await request(app)
      .post('/internal/streaks/hand-completed')
      .set('X-Internal-Secret', SECRET as string)
      .set('Content-Type', 'application/json')
      .send({ playerId: PLAYER_ID, tableId: 456, handId: 'hand-5' });

    expect(res.status).toBe(400);
  });

  it('non-ISO completedAt → 400', async () => {
    const res = await request(app)
      .post('/internal/streaks/hand-completed')
      .set('X-Internal-Secret', SECRET as string)
      .set('Content-Type', 'application/json')
      .send({ playerId: PLAYER_ID, tableId: 456, handId: 'hand-6', completedAt: 'not-a-date' });

    expect(res.status).toBe(400);
  });

  it('GET /player/streaks → play axis advanced, login axis untouched (FR-1.3)', async () => {
    const res = await request(app)
      .get('/api/v1/player/streaks')
      .set('X-Player-Id', PLAYER_ID);

    expect(res.status).toBe(200);
    expect(res.body.playStreak).toBe(1);
    expect(res.body.lastPlayDate).toBe(DATE);
    // The play event must NOT have touched the login axis.
    expect(res.body.loginStreak).toBe(0);
    expect(res.body.lastLoginDate).toBeNull();
  });
});
