import fs from 'node:fs';
import path from 'node:path';

import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { Loan } from '../src/models/Loan';
import { Payment } from '../src/models/Payment';
import { SalarySlip } from '../src/models/SalarySlip';
import { User } from '../src/models/User';

const app = createApp();
const uploadsDir = path.resolve('./uploads-test');

async function registerBorrower(email: string): Promise<string> {
  const response = await request(app).post('/api/v1/auth/register').send({
    email,
    password: 'Password123!',
    fullName: 'Flow Borrower',
  });
  return response.body.data.token as string;
}

describe('borrower flow', () => {
  beforeAll(async () => {
    await connectDatabase();
    await User.init();
    await Loan.init();
    await SalarySlip.init();
    fs.mkdirSync(uploadsDir, { recursive: true });
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Loan.deleteMany({}),
      SalarySlip.deleteMany({}),
      Payment.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await disconnectDatabase();
    fs.rmSync(uploadsDir, { recursive: true, force: true });
  });

  it('rejects BRE-failing profile', async () => {
    const token = await registerBorrower('bre-fail@example.com');

    const response = await request(app)
      .put('/api/v1/borrowers/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Too Young',
        pan: 'ABCDE1234F',
        dateOfBirth: '2012-01-01',
        monthlySalaryPaise: 3_000_000,
        employmentMode: 'Salaried',
      });

    expect(response.status).toBe(422);
    expect(response.body.error.details.some((d: { rule: string }) => d.rule === 'BRE-AGE')).toBe(
      true,
    );
  });

  it('completes profile, upload, preview, and apply', async () => {
    const token = await registerBorrower('bre-pass@example.com');

    const profile = await request(app)
      .put('/api/v1/borrowers/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Eligible Borrower',
        pan: 'ABCDE1234F',
        dateOfBirth: '1995-06-15',
        monthlySalaryPaise: 3_000_000,
        employmentMode: 'Salaried',
      });

    expect(profile.status).toBe(200);
    expect(profile.body.data.user.profileComplete).toBe(true);

    const upload = await request(app)
      .post('/api/v1/borrowers/me/salary-slip')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('%PDF-1.4 test'), 'salary.pdf');

    expect(upload.status).toBe(201);
    const salarySlipId = upload.body.data.id as string;

    const preview = await request(app)
      .post('/api/v1/loans/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({ principalPaise: 10_000_000, tenureDays: 365 });

    expect(preview.status).toBe(200);
    expect(preview.body.data.interestPaise).toBe(1_200_000);

    const apply = await request(app)
      .post('/api/v1/loans/apply')
      .set('Authorization', `Bearer ${token}`)
      .send({
        principalPaise: 10_000_000,
        tenureDays: 365,
        salarySlipId,
      });

    expect(apply.status).toBe(201);
    expect(apply.body.data.status).toBe('APPLIED');
    expect(apply.body.data.totalRepaymentPaise).toBe(11_200_000);

    const list = await request(app)
      .get('/api/v1/loans/me')
      .set('Authorization', `Bearer ${token}`);

    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);

    const secondApply = await request(app)
      .post('/api/v1/loans/apply')
      .set('Authorization', `Bearer ${token}`)
      .send({
        principalPaise: 10_000_000,
        tenureDays: 180,
        salarySlipId,
      });

    expect(secondApply.status).toBe(409);
  });
});
