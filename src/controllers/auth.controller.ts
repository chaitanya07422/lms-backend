import type { Request, Response } from 'express';

import * as authService from '../services/auth.service';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response';
import type { LoginBody, RegisterBody } from '../validators/auth.validators';

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.registerBorrower(req.body as RegisterBody);
  sendSuccess(res, result, 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.loginUser(req.body as LoginBody);
  sendSuccess(res, result);
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw AppError.unauthorized();
  }

  const user = await authService.getCurrentUser(req.user.id);
  sendSuccess(res, { user });
}
