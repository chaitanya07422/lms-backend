import type { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger';

/**
 * Minimal access log: method, path, status, duration.
 * Does not log bodies, headers, or tokens.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();

  res.on('finish', () => {
    const path = req.originalUrl.split('?')[0] ?? req.path;

    logger.info('http_request', {
      method: req.method,
      path,
      status: res.statusCode,
      durationMs: Date.now() - started,
      ip: req.ip,
    });
  });

  next();
}
