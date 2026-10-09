import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { User } from '../src/models/User';

const app = createApp();

async function createAdminToken(): Promise<string> {
  const passwordHash = await bcrypt.hash('Password123!', 10);
  await User.create({
    email: 'admin-test@lms.local',
    fullName: 'Test Admin',
    role: 'admin',
    passwordHash,
    profileComplete: false,
  });

  const login = await request(app).post('/api/v1/auth/login').send({
    email: 'admin-test@lms.local',
    password: 'Password123!',
  });

  return login.body.data.token as string;
}

describe('POST /ops/admin/users', () => {
  beforeAll(async () => {
    await connectDatabase();
    await User.init();
  });


  beforeEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('allows admin to create a sales user', async () => {
    const token = await createAdminToken();

    const response = await request(app)
      .post('/api/v1/ops/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'new.sales@lms.local',
        password: 'Password123!',
        fullName: 'New Sales',
        role: 'sales',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe('sales');
    expect(response.body.data.user.email).toBe('new.sales@lms.local');
    expect(response.body.data.token).toBeUndefined();
  });

  it('forbids non-admin from creating users', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'borrower-admin-test@example.com',
      password: 'Password123!',
      fullName: 'Borrower',
    });

    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'borrower-admin-test@example.com',
      password: 'Password123!',
    });

    const response = await request(app)
      .post('/api/v1/ops/admin/users')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({
        email: 'blocked@lms.local',
        password: 'Password123!',
        fullName: 'Blocked',
        role: 'collection',
      });

    expect(response.status).toBe(403);
  });

  it('rejects invalid role', async () => {
    const token = await createAdminToken();

    const response = await request(app)
      .post('/api/v1/ops/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'bad-role@lms.local',
        password: 'Password123!',
        fullName: 'Bad Role',
        role: 'superuser',
      });

    expect(response.status).toBe(422);
  });
});
