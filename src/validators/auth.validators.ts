import { z } from 'zod';

import { fullNameSchema } from './name';
import { passwordSchema } from './password';

export const registerBodySchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: passwordSchema,
  fullName: fullNameSchema,
});

export const loginBodySchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
