import type { Request, Response } from 'express';

import * as loanService from '../services/loan.service';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response';
import type { LoanApplyBody, LoanPreviewBody } from '../validators/loan.validators';

function requireUser(req: Request): { id: string } {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  return req.user;
}

export async function preview(req: Request, res: Response): Promise<void> {
  requireUser(req);
  const quote = loanService.previewLoan(req.body as LoanPreviewBody);
  sendSuccess(res, quote);
}

export async function apply(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const loan = await loanService.applyForLoan(user.id, req.body as LoanApplyBody);
  sendSuccess(res, loan, 201);
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const items = await loanService.listMyLoans(user.id);
  sendSuccess(res, { items });
}

export async function getMine(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const loanId = req.params.loanId;
  if (!loanId) {
    throw AppError.validation('loanId is required');
  }
  const detail = await loanService.getMyLoanDetail(user.id, loanId);
  sendSuccess(res, detail);
}
