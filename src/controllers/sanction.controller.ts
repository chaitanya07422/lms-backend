import type { Request, Response } from 'express';

import * as sanctionService from '../services/sanction.service';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response';
import type { RejectLoanBody } from '../validators/ops.validators';

function requireUserId(req: Request): string {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  return req.user.id;
}

export async function listLoans(_req: Request, res: Response): Promise<void> {
  const items = await sanctionService.listAppliedLoans();
  sendSuccess(res, { items });
}

export async function getLoan(req: Request, res: Response): Promise<void> {
  const loanId = req.params.loanId;
  if (!loanId) {
    throw AppError.validation('loanId is required');
  }
  const detail = await sanctionService.getAppliedLoanDetail(loanId);
  sendSuccess(res, detail);
}

export async function approve(req: Request, res: Response): Promise<void> {
  const loanId = req.params.loanId;
  if (!loanId) {
    throw AppError.validation('loanId is required');
  }
  const loan = await sanctionService.approveLoan(loanId, requireUserId(req));
  sendSuccess(res, { loan });
}

export async function reject(req: Request, res: Response): Promise<void> {
  const loanId = req.params.loanId;
  if (!loanId) {
    throw AppError.validation('loanId is required');
  }
  const body = req.body as RejectLoanBody;
  const loan = await sanctionService.rejectLoan(loanId, requireUserId(req), body.reason);
  sendSuccess(res, { loan });
}
