import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/** Cursor pagination for ops loan queues (Gmail-style pages). */
export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(512).optional(),
  limit: z.coerce.number().int().positive().max(50).default(12),
});

export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;

export const rejectLoanBodySchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export const recordPaymentBodySchema = z.object({
  utr: z.string().trim().min(1).max(64),
  amountPaise: z.number().int().positive(),
  paidAt: z.string().date().optional(),
});

export type RejectLoanBody = z.infer<typeof rejectLoanBodySchema>;
export type RecordPaymentBody = z.infer<typeof recordPaymentBodySchema>;
