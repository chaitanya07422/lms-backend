import { z } from 'zod';

import { EMPLOYMENT_MODES } from '../types/roles';

import { fullNameSchema } from './name';

export const profileBodySchema = z.object({
  fullName: fullNameSchema,
  pan: z.string().trim().toUpperCase(),
  dateOfBirth: z.string().date(),
  monthlySalaryPaise: z.number().int().nonnegative(),
  employmentMode: z.enum(EMPLOYMENT_MODES),
});

export type ProfileBody = z.infer<typeof profileBodySchema>;
