import type { NextFunction, Request, Response } from 'express';

import { User } from '../models/User';
import type { UserRole } from '../types/roles';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/jwt';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(AppError.unauthorized());
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    next(AppError.unauthorized());
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    // Role from DB so UI (/auth/me) and API checks stay in sync after role changes.
    const user = await User.findById(payload.sub).select('email role');
    if (!user) {
      next(AppError.unauthorized('User no longer exists'));
      return;
    }

    req.user = {
      id: String(user._id),
      email: user.email,
      role: user.role as UserRole,
    };
    next();
  } catch (error) {
    next(error);
  }
}

/** Route-level RBAC — e.g. authorize('disbursement', 'admin'). */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(AppError.forbidden());
      return;
    }

    next();
  };
}
