import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import type { ObjectStore, PutObjectInput, StoredObjectRef } from './types';

function uploadsRoot(): string {
  const dir = path.resolve(env.UPLOADS_DIR);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export class LocalObjectStore implements ObjectStore {
  async put(input: PutObjectInput): Promise<StoredObjectRef> {
    const absolutePath = path.join(uploadsRoot(), input.key);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    await fs.promises.writeFile(absolutePath, input.body);
    return { storagePath: path.relative(process.cwd(), absolutePath) };
  }

  async openReadStream(storagePath: string): Promise<Readable> {
    const absolutePath = path.isAbsolute(storagePath)
      ? storagePath
      : path.resolve(process.cwd(), storagePath);

    if (!fs.existsSync(absolutePath)) {
      throw AppError.notFound('Salary slip file missing on server');
    }

    return fs.createReadStream(absolutePath);
  }
}
