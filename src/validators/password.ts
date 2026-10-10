import { z } from 'zod';

/** Shared rules for register + admin create-user (not applied to login). */
export const PASSWORD_RULES_HINT =
  'At least 8 characters, with uppercase, lowercase, number, and special character';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');
