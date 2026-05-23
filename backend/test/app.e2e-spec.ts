import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest') as typeof import('supertest');
import { createTestApp } from './test-app.factory';

describe('App (E2E) — smoke test', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register returns 400 for missing body (ValidationPipe active)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({})
      .expect(400);
  });

  it('GET /auth/profile returns 401 when unauthenticated (JwtAuthGuard active)', async () => {
    await request(app.getHttpServer()).get('/auth/profile').expect(401);
  });

  it('GET /alerts returns 401 when unauthenticated (JwtAuthGuard active)', async () => {
    await request(app.getHttpServer()).get('/alerts').expect(401);
  });
});
