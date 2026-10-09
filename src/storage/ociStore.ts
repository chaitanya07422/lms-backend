import { Readable } from 'node:stream';

import { ConfigFileAuthenticationDetailsProvider, Region } from 'oci-common';
import { ObjectStorageClient } from 'oci-objectstorage';

import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import type { ObjectStore, PutObjectInput, StoredObjectRef } from './types';

const OCI_PREFIX = 'oci:';

function toReadable(value: unknown): Readable {
  if (value instanceof Readable) {
    return value;
  }
  if (Buffer.isBuffer(value)) {
    return Readable.from(value);
  }
  if (value instanceof Uint8Array) {
    return Readable.from(Buffer.from(value));
  }
  throw AppError.notFound('Salary slip file missing on server');
}

export class OciObjectStore implements ObjectStore {
  private readonly client: ObjectStorageClient;
  private readonly namespace: string;
  private readonly bucket: string;

  constructor() {
    if (!env.OCI_NAMESPACE || !env.OCI_BUCKET) {
      throw new Error('OCI_NAMESPACE and OCI_BUCKET are required for STORAGE_DRIVER=oci');
    }

    const provider = new ConfigFileAuthenticationDetailsProvider(
      env.OCI_CONFIG_FILE,
      env.OCI_PROFILE,
    );

    this.client = new ObjectStorageClient({
      authenticationDetailsProvider: provider,
    });

    if (env.OCI_REGION) {
      this.client.region = Region.fromRegionId(env.OCI_REGION);
    }

    this.namespace = env.OCI_NAMESPACE;
    this.bucket = env.OCI_BUCKET;
  }

  async put(input: PutObjectInput): Promise<StoredObjectRef> {
    await this.client.putObject({
      namespaceName: this.namespace,
      bucketName: this.bucket,
      objectName: input.key,
      putObjectBody: Readable.from(input.body),
      contentLength: input.body.length,
      contentType: input.contentType,
    });

    return { storagePath: `${OCI_PREFIX}${input.key}` };
  }

  async openReadStream(storagePath: string): Promise<Readable> {
    const objectName = storagePath.startsWith(OCI_PREFIX)
      ? storagePath.slice(OCI_PREFIX.length)
      : storagePath;

    try {
      const response = await this.client.getObject({
        namespaceName: this.namespace,
        bucketName: this.bucket,
        objectName,
      });

      return toReadable(response.value);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.notFound('Salary slip file missing on server');
    }
  }
}
