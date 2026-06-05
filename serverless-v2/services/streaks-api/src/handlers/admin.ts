/**
 * POST /api/v1/admin/streaks/freezes/grant (FR-3.3, API_CONTRACT.md §4.7) —
 * operator endpoint to grant freeze(s) to a player (purchased-balance top-up;
 * payment processing is out of scope). Increases `freezesAvailable`.
 *
 * Auth (Inv 10): mounted with `internalAuthMiddleware` (X-Internal-Secret) ONLY
 * — NEVER player auth; the target player is in the BODY, never `X-Player-Id`.
 * A missing/invalid secret is a 403 from the middleware before this runs.
 *
 * THIN handler (Inv 6): validates `count >= 1` (integer; else 400), confirms the
 * player exists (else 404 — we never grant to a typo'd id), then grants via the
 * repository's `grantFreezeAdmin` (pattern J — `ADD freezesAvailable :n`, the
 * one allowed bare `ADD` since it is the freeze BALANCE, not a streak counter).
 * The soft `99` cap is enforced in the repository's ConditionExpression; an
 * over-cap grant surfaces as a `ConditionalCheckFailedException`, which this
 * handler maps to `409 Conflict` (the only documented 409). No `docClient` here.
 */
import type { Request, Response } from 'express';

import { getPlayer, grantFreezeAdmin } from '../repositories/dynamo.repository';
import { nowIso } from '../lib/utc';
import { logger } from '../../shared/config/logger';
import type { AdminGrantResponse } from '../domain/types';

/** The validated admin-grant body. */
interface GrantBody {
  playerId: string;
  count: number;
}

export async function grantFreezesHandler(req: Request, res: Response): Promise<void> {
  const body = validateBody(req.body);
  if (body === null) {
    res.status(400).json({
      error: 'BadRequest',
      message: 'playerId is required and count must be an integer >= 1',
    });
    return;
  }

  const { playerId, count } = body;

  try {
    // Unknown player → 404 (never grant to a typo'd id, §4.7 errors).
    const existing = await getPlayer(playerId);
    if (existing === null) {
      res.status(404).json({ error: 'NotFound', message: 'Unknown playerId' });
      return;
    }

    const result = await grantFreezeAdmin({ playerId, count, now: nowIso() });

    logger.info('admin granted freezes', {
      playerId,
      granted: count,
      freezesAvailable: result.freezesAvailable,
    });

    const response: AdminGrantResponse = {
      playerId,
      granted: count,
      freezesAvailable: result.freezesAvailable,
      source: 'purchased',
      updatedAt: result.updatedAt,
    };
    res.status(200).json(response);
  } catch (err) {
    // The repository's cap ConditionExpression failing means the grant would
    // exceed the 99 soft cap → 409 Conflict (the only documented 409, §4.7).
    if (isConditionalCheckFailed(err)) {
      res.status(409).json({
        error: 'Conflict',
        message: 'Freeze grant exceeds the maximum balance of 99',
      });
      return;
    }
    logger.error('admin grantFreezes failed', { playerId, err });
    res.status(500).json({ error: 'InternalError', message: 'Failed to grant freezes' });
  }
}

/**
 * Validate the §4.7 body: `playerId` a non-empty string, `count` an integer
 * `>= 1`. Anything else (≤0, non-integer, missing) → `null` (→ 400).
 */
function validateBody(raw: unknown): GrantBody | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const b = raw as Record<string, unknown>;
  const { playerId, count } = b;

  if (typeof playerId !== 'string' || playerId.trim() === '') {
    return null;
  }
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) {
    return null;
  }
  return { playerId, count };
}

/** True for a DynamoDB conditional-check failure (the over-cap grant). */
function isConditionalCheckFailed(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: string }).name === 'ConditionalCheckFailedException'
  );
}
