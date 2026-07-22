import { Request, Response, NextFunction } from 'express';

const ALLOWED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Rejects requests whose Host header does not point at the local machine.
 * This defends against DNS-rebinding attacks, where a malicious website
 * resolves its own domain to 127.0.0.1 to bypass the browser's same-origin
 * policy and drive this local API.
 */
export function hostGuard(req: Request, res: Response, next: NextFunction) {
  const host = req.headers.host || '';
  // Strip the port; handle bracketed IPv6 hosts like [::1]:5001.
  const hostname = host.startsWith('[')
    ? host.slice(0, host.indexOf(']') + 1)
    : host.split(':')[0];

  if (!ALLOWED_HOSTNAMES.has(hostname)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_HOST',
        message: 'This API only accepts requests addressed to localhost.',
      },
    });
  }
  next();
}
