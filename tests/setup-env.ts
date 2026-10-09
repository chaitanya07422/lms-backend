// Vitest setup: provide env vars before src/config/env.ts is imported.
// CI has no .env file; these defaults satisfy Zod validation for tests only.
process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '4000';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/lms_test';
process.env.CORS_ORIGIN ??= 'http://localhost:3000';
process.env.TRUST_PROXY ??= 'false';
process.env.JWT_SECRET ??= 'test_jwt_secret_16chars';
process.env.JWT_EXPIRES_IN ??= '8h';
process.env.BCRYPT_SALT_ROUNDS ??= '10';
process.env.AUTH_RATE_LIMIT_WINDOW_MS ??= '900000';
process.env.AUTH_RATE_LIMIT_MAX ??= '1000';
process.env.STORAGE_DRIVER ??= 'local';
process.env.UPLOADS_DIR ??= './uploads-test';
process.env.MAX_UPLOAD_BYTES ??= '5242880';
