import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { authorize } from '../src/middleware/auth';
import { User } from '../src/models/User';
import { AppError } from '../src/utils/AppError';

const app = createApp();

describe('auth', () => {
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

  it('registers a borrower and returns a token', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      email: 'new.borrower@example.com',
      password: 'Password123!',
      fullName: 'New Borrower',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.role).toBe('borrower');
    expect(typeof response.body.data.token).toBe('string');
  });

  it('rejects duplicate email registration', async () => {
    const body = {
      email: 'dup@example.com',
      password: 'Password123!',
      fullName: 'Dup User',
    };

    await request(app).post('/api/v1/auth/register').send(body);
    const response = await request(app).post('/api/v1/auth/register').send(body);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('logs in with valid credentials', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'login@example.com',
      password: 'Password123!',
      fullName: 'Login User',
    });

    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'login@example.com',
      password: 'Password123!',
    });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe('login@example.com');
    expect(typeof response.body.data.token).toBe('string');
  });

  it('rejects invalid login', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'missing@example.com',
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
  });

  it('rejects weak passwords on register', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      email: 'weak@example.com',
      password: 'password',
      fullName: 'Weak User',
    });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
  });

  it('returns current user for /auth/me', async () => {
    const registered = await request(app).post('/api/v1/auth/register').send({
      email: 'me@example.com',
      password: 'Password123!',
      fullName: 'Me User',
    });

    const token = registered.body.data.token as string;
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe('me@example.com');
  });

  it('rejects /auth/me without token', async () => {
    const response = await request(app).get('/api/v1/auth/me');
    expect(response.status).toBe(401);
  });
});

describe('authorize middleware', () => {
  it('allows listed roles and rejects others', () => {
    const nextAllow = vi.fn() as NextFunction;
    authorize('sales', 'admin')(
      { user: { id: '1', email: 's@x.com', role: 'sales' } } as Request,
      {} as Response,
      nextAllow,
    );
    expect(nextAllow).toHaveBeenCalledWith();

    const nextDeny = vi.fn() as NextFunction;
    authorize('sales', 'admin')(
      { user: { id: '2', email: 'b@x.com', role: 'borrower' } } as Request,
      {} as Response,
      nextDeny,
    );
    expect(nextDeny).toHaveBeenCalledWith(expect.any(AppError));
    const err = (nextDeny as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(403);
  });
});
