/**
 * Load before any other app modules so HTTP/Express instrumentation can attach.
 * Imported first from server.ts. No-op when SENTRY_DSN is unset.
 */
import { config as loadDotenv } from 'dotenv';
import * as Sentry from '@sentry/node';

loadDotenv();

const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

export { Sentry };
