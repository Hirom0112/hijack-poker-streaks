import type { Request, Response, NextFunction } from 'express';
import { internalAuthMiddleware } from '../../src/middleware/internalAuth';

function mockRes(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe('middleware/internalAuth (Inv 10)', () => {
  const ORIGINAL = process.env.INTERNAL_API_SECRET;

  beforeAll(() => {
    process.env.INTERNAL_API_SECRET = 'dev-internal-secret';
  });

  afterAll(() => {
    process.env.INTERNAL_API_SECRET = ORIGINAL;
  });

  it('returns 403 Forbidden when the secret is missing', () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    internalAuthMiddleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Forbidden', message: expect.any(String) });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 Forbidden when the secret is wrong', () => {
    const req = { headers: { 'x-internal-secret': 'nope' } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    internalAuthMiddleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when the secret matches', () => {
    const req = { headers: { 'x-internal-secret': 'dev-internal-secret' } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    internalAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(0);
  });
});
