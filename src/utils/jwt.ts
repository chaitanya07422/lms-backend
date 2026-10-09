import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '../config/env';
import type { UserRole } from '../types/roles';
import { AppError } from './AppError';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export function signAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded !== 'object' || decoded === null) {
      throw AppError.unauthorized('Invalid token');
    }

    const { sub, email, role } = decoded as Partial<JwtPayload>;
    if (typeof sub !== 'string' || typeof email !== 'string' || typeof role !== 'string') {
      throw AppError.unauthorized('Invalid token');
    }

    return { sub, email, role: role as UserRole };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw AppError.unauthorized('Invalid or expired token');
  }
}
