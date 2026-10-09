import rateLimit from 'express-rate-limit';

import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export const authRateLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(AppError.tooManyRequests('Too many authentication attempts. Try again later.'));
  },
});
