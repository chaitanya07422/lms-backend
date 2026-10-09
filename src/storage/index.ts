import { env } from '../config/env';
import { LocalObjectStore } from './localStore';
import { OciObjectStore } from './ociStore';
import type { ObjectStore } from './types';

let store: ObjectStore | undefined;

export function getObjectStore(): ObjectStore {
  if (!store) {
    store = env.STORAGE_DRIVER === 'oci' ? new OciObjectStore() : new LocalObjectStore();
  }
  return store;
}

/** Test helper to reset singleton between suites if needed. */
export function resetObjectStore(): void {
  store = undefined;
}
