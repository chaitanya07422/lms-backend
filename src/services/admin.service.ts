import bcrypt from 'bcrypt';

import { env } from '../config/env';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { isDuplicateKeyError } from '../utils/mongoErrors';
import type { CreateUserBody } from '../validators/admin.validators';
import { toPublicUser, type PublicUser } from './auth.service';

/** Admin creates any role account. Does not issue a JWT for the new user. */
export async function createUserByAdmin(input: CreateUserBody): Promise<PublicUser> {
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

  try {
    const user = await User.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
      profileComplete: false,
    });
    return toPublicUser(user);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw AppError.conflict('Email is already registered');
    }
    throw error;
  }
}
