import { z } from 'zod';

/** Letters only (A–Z, a–z), single spaces between words. */
export const FULL_NAME_HINT = 'Letters only (A–Z, a–z)';

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100)
  .regex(/^[A-Za-z]+(?: [A-Za-z]+)*$/, 'Name must contain only letters');
