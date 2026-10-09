import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';

// Smoke tests for the Phase 1 scaffold — no database required.
describe('GET /api/v1/health', () => {
  it('returns ok envelope', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: 'ok' },
    });
    expect(typeof response.body.data.uptime).toBe('number');
  });
});

describe('unknown routes', () => {
  it('returns a not found envelope', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
