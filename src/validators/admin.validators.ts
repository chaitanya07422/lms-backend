import { z } from 'zod';

import { USER_ROLES } from '../types/roles';

export const createUserBodySchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().trim().min(2).max(100),
  role: z.enum(USER_ROLES),
});

export type CreateUserBody = z.infer<typeof createUserBodySchema>;
