import type { Request, Response } from 'express';

import * as borrowerProfileService from '../services/borrowerProfile.service';
import * as salarySlipService from '../services/salarySlip.service';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response';
import type { ProfileBody } from '../validators/borrower.validators';

function requireUser(req: Request): { id: string; role: string } {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  return req.user;
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const result = await borrowerProfileService.updateBorrowerProfile(
    user.id,
    req.body as ProfileBody,
  );
  sendSuccess(res, result);
}

export async function checkBre(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.body as Partial<ProfileBody>;
  const bre = await borrowerProfileService.checkBreForBorrower(
    user.id,
    Object.keys(body).length > 0 ? body : undefined,
  );
  sendSuccess(res, bre);
}

export async function uploadSalarySlip(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  if (!req.file) {
    throw AppError.validation('file is required');
  }

  const slip = await salarySlipService.saveSalarySlip(user.id, req.file);
  sendSuccess(res, slip, 201);
}

export async function latestSalarySlip(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const slip = await salarySlipService.getLatestSalarySlip(user.id);
  sendSuccess(res, slip);
}
