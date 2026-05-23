import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest') as typeof import('supertest');
import { createTestApp } from './test-app.factory';

describe('Alerts (E2E)', () => {
  let app: INestApplication;
  let accessToken: string;
  let createdAlertId: string;

  beforeAll(async () => {
    ({ app } = await createTestApp());

    // Register + login to get a token for all protected routes
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'alerts@example.com', password: 'password123' });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'alerts@example.com', password: 'password123' });

    accessToken = (loginRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /alerts', () => {
    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .post('/alerts')
        .send({ symbol: 'AAPL', targetPrice: 200, condition: 'above' })
        .expect(401);
    });

    it('creates an alert and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ symbol: 'AAPL', targetPrice: 200, condition: 'above' })
        .expect(201);

      expect(res.body).toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        id: expect.any(String),
        symbol: 'AAPL',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        targetPrice: expect.any(Number),
        condition: 'above',
        active: true,
      });

      createdAlertId = (res.body as { id: string }).id;
    });

    it('returns 400 for invalid payload (negative price)', async () => {
      await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ symbol: 'AAPL', targetPrice: -5, condition: 'above' })
        .expect(400);
    });

    it('returns 400 for invalid condition value', async () => {
      await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ symbol: 'AAPL', targetPrice: 100, condition: 'sideways' })
        .expect(400);
    });
  });

  describe('GET /alerts', () => {
    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).get('/alerts').expect(401);
    });

    it("returns the authenticated user's alerts", async () => {
      const res = await request(app.getHttpServer())
        .get('/alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown[]).length).toBeGreaterThanOrEqual(1);
      expect((res.body as Array<{ symbol: string }>)[0].symbol).toBe('AAPL');
    });
  });

  describe('DELETE /alerts/:id', () => {
    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .delete(`/alerts/${createdAlertId}`)
        .expect(401);
    });

    it('deletes the alert and returns 204', async () => {
      await request(app.getHttpServer())
        .delete(`/alerts/${createdAlertId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('returns 404 after the alert is deleted', async () => {
      await request(app.getHttpServer())
        .delete(`/alerts/${createdAlertId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
