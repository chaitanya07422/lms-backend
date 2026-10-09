import path from 'node:path';
import type { Readable } from 'node:stream';

import { SalarySlip, type SalarySlipDocument } from '../models/SalarySlip';
import { User } from '../models/User';
import { getObjectStore } from '../storage';
import { AppError } from '../utils/AppError';

export interface SalarySlipDto {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface SalarySlipDownload {
  stream: Readable;
  mimeType: string;
  originalName: string;
}

export function toSalarySlipDto(slip: SalarySlipDocument): SalarySlipDto {
  return {
    id: String(slip._id),
    originalName: slip.originalName,
    mimeType: slip.mimeType,
    sizeBytes: slip.sizeBytes,
    createdAt: (slip.createdAt ?? new Date()).toISOString(),
  };
}

function buildObjectKey(borrowerId: string, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `salary-slips/${borrowerId}/${unique}${ext}`;
}

export async function saveSalarySlip(
  borrowerId: string,
  file: Express.Multer.File,
): Promise<SalarySlipDto> {
  const user = await User.findById(borrowerId);
  if (!user || user.role !== 'borrower') {
    throw AppError.forbidden('Only borrowers can upload salary slips');
  }

  if (!file.buffer) {
    throw AppError.validation('Upload failed — empty file buffer');
  }

  const key = buildObjectKey(borrowerId, file.originalname);
  const stored = await getObjectStore().put({
    key,
    body: file.buffer,
    contentType: file.mimetype,
  });

  const slip = await SalarySlip.create({
    borrowerId,
    originalName: path.basename(file.originalname),
    mimeType: file.mimetype,
    sizeBytes: file.size,
    storagePath: stored.storagePath,
  });

  return toSalarySlipDto(slip);
}

export async function getLatestSalarySlip(borrowerId: string): Promise<SalarySlipDto | null> {
  const slip = await SalarySlip.findOne({ borrowerId }).sort({ createdAt: -1 });
  return slip ? toSalarySlipDto(slip) : null;
}

export async function resolveSalarySlipDownload(
  slipId: string,
  requester: { id: string; role: string },
): Promise<SalarySlipDownload> {
  const slip = await SalarySlip.findById(slipId);
  if (!slip) {
    throw AppError.notFound('Salary slip not found');
  }

  const isOwner = String(slip.borrowerId) === requester.id;
  const isPrivileged = requester.role === 'admin' || requester.role === 'sanction';

  if (!isOwner && !isPrivileged) {
    throw AppError.notFound('Salary slip not found');
  }

  const stream = await getObjectStore().openReadStream(slip.storagePath);

  return {
    stream,
    mimeType: slip.mimeType,
    originalName: slip.originalName,
  };
}
