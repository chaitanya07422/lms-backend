import { z } from 'zod';

import { EMPLOYMENT_MODES } from '../types/roles';

export const profileBodySchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  pan: z.string().trim().toUpperCase(),
  dateOfBirth: z.string().date(),
  monthlySalaryPaise: z.number().int().nonnegative(),
  employmentMode: z.enum(EMPLOYMENT_MODES),
});

export type ProfileBody = z.infer<typeof profileBodySchema>;
