import bcrypt from 'bcrypt';

import { env } from '../config/env';
import { User, type UserDocument } from '../models/User';
import type { UserRole } from '../types/roles';
import { AppError } from '../utils/AppError';
import { signAccessToken } from '../utils/jwt';
import { isDuplicateKeyError } from '../utils/mongoErrors';
import type { LoginBody, RegisterBody } from '../validators/auth.validators';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  profileComplete: boolean;
  pan?: string;
  dateOfBirth?: string;
  monthlySalaryPaise?: number;
  employmentMode?: string;
}

export interface AuthResult {
  user: PublicUser;
  token: string;
}

export function toPublicUser(user: UserDocument): PublicUser {
  const publicUser: PublicUser = {
    id: String(user._id),
    email: user.email,
    fullName: user.fullName,
    role: user.role as UserRole,
    profileComplete: user.profileComplete,
  };

  if (user.pan) {
    publicUser.pan = user.pan;
  }
  if (user.dateOfBirth) {
    publicUser.dateOfBirth = user.dateOfBirth.toISOString();
  }
  if (user.monthlySalaryPaise != null) {
    publicUser.monthlySalaryPaise = user.monthlySalaryPaise;
  }
  if (user.employmentMode) {
    publicUser.employmentMode = user.employmentMode;
  }

  return publicUser;
}

function issueAuth(user: UserDocument): AuthResult {
  const publicUser = toPublicUser(user);
  const token = signAccessToken({
    sub: publicUser.id,
    email: publicUser.email,
    role: publicUser.role,
  });
  return { user: publicUser, token };
}

export async function registerBorrower(input: RegisterBody): Promise<AuthResult> {
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

  try {
    const user = await User.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: 'borrower',
      profileComplete: false,
    });
    return issueAuth(user);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw AppError.conflict('Email is already registered');
    }
    throw error;
  }
}

export async function loginUser(input: LoginBody): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user?.passwordHash) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const matches = await bcrypt.compare(input.password, user.passwordHash);
  if (!matches) {
    throw AppError.unauthorized('Invalid email or password');
  }

  return issueAuth(user);
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.unauthorized('User no longer exists');
  }
  return toPublicUser(user);
}
