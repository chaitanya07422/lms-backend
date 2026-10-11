import mongoose from 'mongoose';

import { Loan } from '../models/Loan';
import { Payment } from '../models/Payment';
import { SalarySlip } from '../models/SalarySlip';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { env } from './env';

/** Ensure unique/compound indexes exist (autoIndex is off in production). */
async function syncCriticalIndexes(): Promise<void> {
  await Promise.all([
    User.syncIndexes(),
    Loan.syncIndexes(),
    Payment.syncIndexes(),
    SalarySlip.syncIndexes(),
  ]);
  logger.info('mongo_indexes_synced');
}

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  await syncCriticalIndexes();
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
