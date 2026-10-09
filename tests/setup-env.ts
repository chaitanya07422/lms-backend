// Vitest setup: provide env vars before src/config/env.ts is imported.
// CI has no .env file; these defaults satisfy Zod validation for tests only.
process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '4000';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/lms_test';
process.env.CORS_ORIGIN ??= 'http://localhost:3000';
process.env.TRUST_PROXY ??= 'false';
