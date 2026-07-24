import { describe, it, expect, afterEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const makeReq = (host: string) => ({ headers: { host } }) as Request;
const makeRes = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

describe('hostGuard', () => {
  const originalEnv = process.env.PUBLIC_DEMO_MODE;

  afterEach(() => {
    process.env.PUBLIC_DEMO_MODE = originalEnv;
    vi.resetModules();
  });

  it('allows localhost/127.0.0.1 hosts and rejects anything else by default', async () => {
    delete process.env.PUBLIC_DEMO_MODE;
    vi.resetModules();
    const { hostGuard } = await import('../hostGuard');

    const next = vi.fn() as NextFunction;
    hostGuard(makeReq('localhost:5001'), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);

    const res = makeRes();
    const blockedNext = vi.fn() as NextFunction;
    hostGuard(makeReq('evil.example.com'), res, blockedNext);
    expect(blockedNext).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('passes every host through once PUBLIC_DEMO_MODE=true', async () => {
    process.env.PUBLIC_DEMO_MODE = 'true';
    vi.resetModules();
    const { hostGuard } = await import('../hostGuard');

    const next = vi.fn() as NextFunction;
    hostGuard(makeReq('my-demo.onrender.com'), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
