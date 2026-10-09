import { Router } from 'express';

import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/authRateLimit';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { loginBodySchema, registerBodySchema } from '../validators/auth.validators';

const authRouter = Router();

authRouter.post(
  '/register',
  authRateLimiter,
  validateBody(registerBodySchema),
  asyncHandler(authController.register),
);

authRouter.post(
  '/login',
  authRateLimiter,
  validateBody(loginBodySchema),
  asyncHandler(authController.login),
);

authRouter.get('/me', authenticate, asyncHandler(authController.me));

export { authRouter };
