import type { Request, Response } from 'express';

import * as disbursementService from '../services/disbursement.service';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response';

function requireUserId(req: Request): string {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  return req.user.id;
}

export async function listLoans(_req: Request, res: Response): Promise<void> {
  const items = await disbursementService.listSanctionedLoans();
  sendSuccess(res, { items });
}

export async function getLoan(req: Request, res: Response): Promise<void> {
  const loanId = req.params.loanId;
  if (!loanId) {
    throw AppError.validation('loanId is required');
  }
  const loan = await disbursementService.getSanctionedLoanDetail(loanId);
  sendSuccess(res, { loan });
}

export async function disburse(req: Request, res: Response): Promise<void> {
  const loanId = req.params.loanId;
  if (!loanId) {
    throw AppError.validation('loanId is required');
  }
  const loan = await disbursementService.disburseLoan(loanId, requireUserId(req));
  sendSuccess(res, { loan });
}
