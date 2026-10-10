import { z } from 'zod';

/** Staff roles only — borrowers self-register via the public signup flow. */
const ADMIN_CREATABLE_ROLES = [
  'admin',
  'sales',
  'sanction',
  'disbursement',
  'collection',
] as const;

export const createUserBodySchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().trim().min(2).max(100),
  role: z.enum(ADMIN_CREATABLE_ROLES),
});

export type CreateUserBody = z.infer<typeof createUserBodySchema>;

export const adminSummaryQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(512).optional(),
  limit: z.coerce.number().int().positive().max(50).default(12),
});

export type AdminSummaryQuery = z.infer<typeof adminSummaryQuerySchema>;
