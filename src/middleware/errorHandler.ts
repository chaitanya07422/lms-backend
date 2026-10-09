import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound('Route not found'));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('app_error', {
        code: err.code,
        message: err.message,
        path: req.originalUrl.split('?')[0],
        method: req.method,
      });
    }
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', details);
    return;
  }

  logger.error('unhandled_error', {
    message: err instanceof Error ? err.message : 'Unknown error',
    stack: err instanceof Error ? err.stack : undefined,
    path: req.originalUrl.split('?')[0],
    method: req.method,
  });

  sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
}
