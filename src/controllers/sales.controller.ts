import type { Request, Response } from 'express';

import * as salesService from '../services/sales.service';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response';
import type { CursorPaginationQuery } from '../validators/ops.validators';

export async function listLeads(req: Request, res: Response): Promise<void> {
  const page = await salesService.listLeads(req.query as unknown as CursorPaginationQuery);
  sendSuccess(res, page);
}

export async function getLead(req: Request, res: Response): Promise<void> {
  const userId = req.params.userId;
  if (!userId) {
    throw AppError.validation('userId is required');
  }
  const lead = await salesService.getLeadDetail(userId);
  sendSuccess(res, { user: lead });
}
