import type { Request, Response } from 'express';

import * as salarySlipService from '../services/salarySlip.service';
import { AppError } from '../utils/AppError';

export async function download(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw AppError.unauthorized();
  }

  const slipId = req.params.id;
  if (!slipId) {
    throw AppError.validation('id is required');
  }

  const file = await salarySlipService.resolveSalarySlipDownload(slipId, req.user);
  const inline = req.query.inline === '1' || req.query.inline === 'true';
  const safeName = file.originalName.replace(/"/g, '');

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader(
    'Content-Disposition',
    `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`,
  );
  file.stream.pipe(res);
}
