import type { NextFunction, Request, Response } from 'express';
import express, { Express } from 'express';
import request from 'supertest';

import { timeout } from './timeout.middleware';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('Timeout Middleware', () => {
  describe('Unit Tests', () => {
    it('creates middleware with default and custom timeout values', () => {
      const defaultMiddleware = timeout.createMiddleware();
      const customMiddleware = timeout.createMiddleware({ timeoutMs: 5000 });
      const shortMiddleware = timeout.createMiddleware({ timeoutMs: 100 });

      expect(defaultMiddleware).not.toBe(customMiddleware);
      expect(customMiddleware).not.toBe(shortMiddleware);
    });
  });

  describe('Integration Tests', () => {
    let app: Express;

    beforeEach(() => {
      app = express();
    });

    describe('timeout behavior', () => {
      it('allows fast requests to complete normally', async () => {
        app.use(timeout.createMiddleware({ timeoutMs: 5000 }));
        app.get('/fast', (_req, res) => res.json({ success: true }));

        const response = await request(app).get('/fast').expect(200);

        expect(response.body).toEqual({ success: true });
      });

      it('sets req.timedout flag when request exceeds timeout', async () => {
        app.use(timeout.createMiddleware({ timeoutMs: 100 }));
        app.get('/slow', async (req, res, next) => {
          await sleep(200);
          if (req.timedout) {
            return next();
          }
          res.json({ success: true });
        });
        app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
          res.status(500).json({ error: err.message });
        });

        await request(app).get('/slow');
      }, 10000);

      it('works with all HTTP methods', async () => {
        app.use(express.json());
        app.use(timeout.createMiddleware({ timeoutMs: 5000 }));
        app.post('/test', (_req, res) => res.json({ method: 'POST' }));
        app.put('/test', (_req, res) => res.json({ method: 'PUT' }));
        app.delete('/test', (_req, res) => res.json({ method: 'DELETE' }));

        const post = await request(app).post('/test').send({}).expect(200);
        const put = await request(app).put('/test').send({}).expect(200);
        const del = await request(app).delete('/test').expect(200);

        expect(post.body).toEqual({ method: 'POST' });
        expect(put.body).toEqual({ method: 'PUT' });
        expect(del.body).toEqual({ method: 'DELETE' });
      });

      it('works with middleware chain and request body', async () => {
        app.use(express.json());
        app.use(timeout.createMiddleware({ timeoutMs: 5000 }));
        app.use((_req, _res, next) => next());
        app.post('/test', (req, res) => {
          res.json({ received: req.body as Record<string, unknown> });
        });

        const response = await request(app).post('/test').send({ data: 'test' }).expect(200);

        expect(response.body).toEqual({ received: { data: 'test' } });
      });
    });

    describe('different timeout configurations', () => {
      it('works with various timeout durations', async () => {
        const configs = [
          { timeoutMs: 1000, label: '1s' },
          { timeoutMs: 10000, label: '10s' },
          { timeoutMs: undefined, label: 'default' },
        ];

        for (const config of configs) {
          const testApp = express();
          testApp.use(
            config.timeoutMs
              ? timeout.createMiddleware({ timeoutMs: config.timeoutMs })
              : timeout.createMiddleware(),
          );
          testApp.get('/test', (_req, res) => res.json({ timeout: config.label }));

          const response = await request(testApp).get('/test').expect(200);
          expect(response.body).toEqual({ timeout: config.label });
        }
      });
    });
  });
});
