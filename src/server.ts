import { createApp } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`lms-backend listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
