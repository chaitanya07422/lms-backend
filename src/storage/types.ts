import type { Readable } from 'node:stream';

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface StoredObjectRef {
  /** Value persisted in MongoDB `salaryslips.storagePath`. */
  storagePath: string;
}

export interface ObjectStore {
  put(input: PutObjectInput): Promise<StoredObjectRef>;
  openReadStream(storagePath: string): Promise<Readable>;
}
