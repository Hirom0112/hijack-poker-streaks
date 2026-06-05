import type { Request, Response, NextFunction } from 'express';

/**
 * Internal/admin auth middleware (Inv 10).
 *
 * Guards internal endpoints (e.g. POST /internal/streaks/hand-completed) and
 * the admin view-history endpoint with the shared `INTERNAL_API_SECRET`,
 * supplied via the `X-Internal-Secret` header. This is NOT player auth —
 * it must never sit on the player-auth surface.
 *
 * Missing or mismatched secret → 403 Forbidden with the canonical error shape.
 */
export function internalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const provided = req.headers['x-internal-secret'];
  const expected = process.env.INTERNAL_API_SECRET;

  if (!expected || provided !== expected) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Valid X-Internal-Secret header is required',
    });
    return;
  }

  next();
}
