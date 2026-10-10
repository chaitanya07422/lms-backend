import type { Request, Response } from 'express';

import * as collectionService from '../services/collection.service';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response';
import type {
  CursorPaginationQuery,
  RecordPaymentBody,
} from '../validators/ops.validators';

function requireUserId(req: Request): string {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  return req.user.id;
}

export async function listLoans(req: Request, res: Response): Promise<void> {
  const page = await collectionService.listDisbursedLoans(
    req.query as unknown as CursorPaginationQuery,
  );
  sendSuccess(res, page);
}

export async function getLoan(req: Request, res: Response): Promise<void> {
  const loanId = req.params.loanId;
  if (!loanId) {
    throw AppError.validation('loanId is required');
  }
  const detail = await collectionService.getCollectionLoanDetail(loanId);
  sendSuccess(res, detail);
}

export async function listPayments(req: Request, res: Response): Promise<void> {
  const loanId = req.params.loanId;
  if (!loanId) {
    throw AppError.validation('loanId is required');
  }
  const items = await collectionService.listPayments(loanId);
  sendSuccess(res, { items });
}

export async function recordPayment(req: Request, res: Response): Promise<void> {
  const loanId = req.params.loanId;
  if (!loanId) {
    throw AppError.validation('loanId is required');
  }
  const result = await collectionService.recordPayment(
    loanId,
    requireUserId(req),
    req.body as RecordPaymentBody,
  );
  sendSuccess(res, result, 201);
}
