import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    JWT_EXPIRES_IN: z.string().min(1).default('8h'),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    STORAGE_DRIVER: z.enum(['local', 'oci']).default('local'),
    UPLOADS_DIR: z.string().min(1).default('./uploads'),
    MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(5_242_880),
    OCI_NAMESPACE: z.string().optional(),
    OCI_BUCKET: z.string().optional(),
    OCI_REGION: z.string().optional(),
    OCI_CONFIG_FILE: z.string().optional(),
    OCI_PROFILE: z.string().default('DEFAULT'),
  })
  .superRefine((data, ctx) => {
    if (data.STORAGE_DRIVER === 'oci') {
      if (!data.OCI_NAMESPACE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['OCI_NAMESPACE'],
          message: 'OCI_NAMESPACE is required when STORAGE_DRIVER=oci',
        });
      }
      if (!data.OCI_BUCKET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['OCI_BUCKET'],
          message: 'OCI_BUCKET is required when STORAGE_DRIVER=oci',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${details}`);
  }

  return result.data;
}

export const env = parseEnv();
