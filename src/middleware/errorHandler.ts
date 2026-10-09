import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/response';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound('Route not found'));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
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

  if (env.NODE_ENV !== 'production') {
    console.error(err);
  }

  sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
}
