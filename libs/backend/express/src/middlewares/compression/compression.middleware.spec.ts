import express, { Express } from 'express';
import request from 'supertest';

import { compression } from './compression.middleware';

describe('Compression Middleware', () => {
  describe('Unit Tests', () => {
    it('creates middleware with default and custom options', () => {
      const defaultMiddleware = compression.createMiddleware();
      const customMiddleware = compression.createMiddleware({
        threshold: 1024,
        level: 6,
        filter: () => true,
      });

      expect(defaultMiddleware).not.toBe(customMiddleware);
    });
  });

  describe('Integration Tests', () => {
    let app: Express;

    beforeEach(() => {
      app = express();
      app.use(compression.createMiddleware());
    });

    describe('compression behavior', () => {
      it('compresses large responses above threshold', async () => {
        const largeData = { data: 'x'.repeat(5000) };
        app.get('/test', (_req, res) => res.json(largeData));

        const gzip = await request(app).get('/test').set('Accept-Encoding', 'gzip').expect(200);
        const deflate = await request(app)
          .get('/test')
          .set('Accept-Encoding', 'deflate')
          .expect(200);

        expect(gzip.headers['content-encoding']).toBe('gzip');
        expect(deflate.headers['content-encoding']).toBe('deflate');
      });

      it('does not compress small responses below threshold', async () => {
        app.get('/test', (_req, res) => res.json({ message: 'small' }));

        const response = await request(app).get('/test').set('Accept-Encoding', 'gzip').expect(200);

        expect(response.headers['content-encoding']).toBeUndefined();
      });

      it('respects x-no-compression header', async () => {
        app.get('/test', (_req, res) => res.json({ data: 'x'.repeat(5000) }));

        const response = await request(app)
          .get('/test')
          .set('Accept-Encoding', 'gzip')
          .set('x-no-compression', '1')
          .expect(200);

        expect(response.headers['content-encoding']).toBeUndefined();
      });

      it('skips compression when client does not support it', async () => {
        app.get('/test', (_req, res) => res.json({ data: 'x'.repeat(5000) }));

        const response = await request(app)
          .get('/test')
          .set('Accept-Encoding', 'identity')
          .expect(200);

        expect(response.headers['content-encoding']).toBeUndefined();
      });
    });

    describe('custom options', () => {
      it('respects custom threshold', async () => {
        const customApp = express();
        customApp.use(compression.createMiddleware({ threshold: 10000 }));
        customApp.get('/test', (_req, res) => res.json({ data: 'x'.repeat(5000) }));

        const response = await request(customApp)
          .get('/test')
          .set('Accept-Encoding', 'gzip')
          .expect(200);

        expect(response.headers['content-encoding']).toBeUndefined();
      });

      it('respects custom filter function', async () => {
        const customApp = express();
        customApp.use(compression.createMiddleware({ filter: () => false }));
        customApp.get('/test', (_req, res) => res.json({ data: 'x'.repeat(5000) }));

        const response = await request(customApp)
          .get('/test')
          .set('Accept-Encoding', 'gzip')
          .expect(200);

        expect(response.headers['content-encoding']).toBeUndefined();
      });
    });
  });
});
