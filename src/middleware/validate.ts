import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

import { AppError } from '../utils/AppError';

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      next(AppError.validation('Request validation failed', details));
      return;
    }

    req.body = result.data;
    next();
  };
}
