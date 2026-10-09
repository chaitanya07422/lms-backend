import type { Request, Response } from 'express';

import * as salesService from '../services/sales.service';
import { AppError } from '../utils/AppError';
import { sendSuccess } from '../utils/response';

export async function listLeads(req: Request, res: Response): Promise<void> {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const result = await salesService.listLeads(page, limit);
  sendSuccess(res, { items: result.items }, 200, result.meta);
}

export async function getLead(req: Request, res: Response): Promise<void> {
  const userId = req.params.userId;
  if (!userId) {
    throw AppError.validation('userId is required');
  }
  const lead = await salesService.getLeadDetail(userId);
  sendSuccess(res, { user: lead });
}
