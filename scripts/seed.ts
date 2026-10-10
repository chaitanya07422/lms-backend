/**
 * Creates demo accounts (idempotent upsert by email).
 * Run: npm run seed
 * Admin only: npm run seed:admin
 */
import bcrypt from 'bcrypt';

import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { env } from '../src/config/env';
import { User } from '../src/models/User';
import type { UserRole } from '../src/types/roles';

interface SeedAccount {
  email: string;
  fullName: string;
  role: UserRole;
  password: string;
}

const SEED_PASSWORD = 'Password123!';

const accounts: SeedAccount[] = [
  { email: 'admin@lms.local', fullName: 'LMS Admin', role: 'admin', password: SEED_PASSWORD },
  { email: 'sales@lms.local', fullName: 'Sales Executive', role: 'sales', password: SEED_PASSWORD },
  {
    email: 'sanction@lms.local',
    fullName: 'Sanction Executive',
    role: 'sanction',
    password: SEED_PASSWORD,
  },
  {
    email: 'disbursement@lms.local',
    fullName: 'Disbursement Executive',
    role: 'disbursement',
    password: SEED_PASSWORD,
  },
  {
    email: 'collection@lms.local',
    fullName: 'Collection Executive',
    role: 'collection',
    password: SEED_PASSWORD,
  },
  {
    email: 'borrower@lms.local',
    fullName: 'Demo Borrower',
    role: 'borrower',
    password: SEED_PASSWORD,
  },
];

async function seed(): Promise<void> {
  await connectDatabase();

  const adminOnly = process.argv.includes('--admin-only');
  const toSeed = adminOnly
    ? accounts.filter((account) => account.role === 'admin')
    : accounts;

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, env.BCRYPT_SALT_ROUNDS);

  for (const account of toSeed) {
    await User.findOneAndUpdate(
      { email: account.email },
      {
        $set: {
          email: account.email,
          fullName: account.fullName,
          role: account.role,
          passwordHash,
          profileComplete: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.log(`seeded ${account.role}: ${account.email}`);
  }

  console.log(`\nDefault password for all seed accounts: ${SEED_PASSWORD}`);
  await disconnectDatabase();
}

seed().catch(async (error: unknown) => {
  console.error('Seed failed', error);
  try {
    await disconnectDatabase();
  } catch {
    // ignore
  }
  process.exit(1);
});
