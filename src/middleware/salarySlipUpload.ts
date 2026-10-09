import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';

import { AppError } from '../utils/AppError';
import { salarySlipUpload } from './upload';

export function handleSalarySlipUpload(req: Request, res: Response, next: NextFunction): void {
  salarySlipUpload(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(AppError.payloadTooLarge('File exceeds 5 MB limit'));
        return;
      }
      next(AppError.validation(err.message));
      return;
    }

    if (err) {
      next(err);
      return;
    }

    next();
  });
}
