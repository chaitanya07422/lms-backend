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

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${file.originalName.replace(/"/g, '')}"`,
  );
  file.stream.pipe(res);
}
