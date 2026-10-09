import { z } from 'zod';

import {
  MAX_PRINCIPAL_PAISE,
  MAX_TENURE_DAYS,
  MIN_PRINCIPAL_PAISE,
  MIN_TENURE_DAYS,
} from '../config/loan';

export const loanPreviewBodySchema = z.object({
  principalPaise: z
    .number()
    .int()
    .min(MIN_PRINCIPAL_PAISE)
    .max(MAX_PRINCIPAL_PAISE),
  tenureDays: z.number().int().min(MIN_TENURE_DAYS).max(MAX_TENURE_DAYS),
});

export const loanApplyBodySchema = loanPreviewBodySchema.extend({
  salarySlipId: z.string().min(1),
});

export type LoanPreviewBody = z.infer<typeof loanPreviewBodySchema>;
export type LoanApplyBody = z.infer<typeof loanApplyBodySchema>;
