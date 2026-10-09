import path from 'node:path';

import multer from 'multer';

import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const ALLOWED: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ALLOWED[file.mimetype];

  if (!allowedExts || !allowedExts.includes(ext)) {
    cb(AppError.validation('Invalid file type. Allowed: PDF, JPG, PNG'));
    return;
  }

  cb(null, true);
}

/** Memory storage — service writes to local disk or OCI Object Storage. */
export const salarySlipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 },
  fileFilter,
}).single('file');
