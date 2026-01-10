import express, { Express } from 'express';
import request from 'supertest';

import { morganLogger } from './morgan.middleware';

describe('Morgan Logger Middleware', () => {
  describe('Unit Tests', () => {
    it('creates middleware with default and custom options', () => {
      const defaultMiddleware = morganLogger.createMiddleware();
      const customMiddleware = morganLogger.createMiddleware({
        format: ':method :url :status',
        skipRoutes: ['/health', '/ready'],
      });

      expect(defaultMiddleware).not.toBe(customMiddleware);
    });
  });

  describe('Integration Tests', () => {
    let app: Express;
    let consoleOutput: string[];
    const originalStdoutWrite = process.stdout.write;

    beforeEach(() => {
      app = express();
      consoleOutput = [];

      process.stdout.write = (chunk: string | Uint8Array): boolean => {
        if (typeof chunk === 'string') {
          consoleOutput.push(chunk);
        }
        return true;
      };
    });

    afterEach(() => {
      process.stdout.write = originalStdoutWrite;
    });

    describe('logging behavior', () => {
      it('logs HTTP requests with method, url, status, and response time', async () => {
        app.use(morganLogger.createMiddleware());
        app.get('/test', (_req, res) => res.json({ ok: true }));

        await request(app).get('/test').expect(200);

        const logOutput = consoleOutput.join('');
        expect(logOutput).toContain('GET');
        expect(logOutput).toContain('/test');
        expect(logOutput).toContain('200');
        expect(logOutput).toContain('ms');
      });

      it('includes request-id from various sources', async () => {
        app.use((req, _res, next) => {
          req.id = 'test-request-123';
          next();
        });
        app.use(morganLogger.createMiddleware());
        app.get('/test', (_req, res) => res.json({ ok: true }));

        await request(app).get('/test').expect(200);
        expect(consoleOutput.join('')).toContain('test-request-123');

        consoleOutput = [];
        const app2 = express();
        app2.use(morganLogger.createMiddleware());
        app2.get('/test', (_req, res) => res.json({ ok: true }));

        await request(app2).get('/test').set('x-request-id', 'header-id-456').expect(200);
        expect(consoleOutput.join('')).toContain('header-id-456');
      });

      it('uses "unknown" when no request-id is present', async () => {
        app.use(morganLogger.createMiddleware());
        app.get('/test', (_req, res) => res.json({ ok: true }));

        await request(app).get('/test').expect(200);

        expect(consoleOutput.join('')).toContain('unknown');
      });

      it('logs all HTTP methods', async () => {
        app.use(express.json());
        app.use(morganLogger.createMiddleware());
        app.post('/test', (_req, res) => res.json({ ok: true }));
        app.put('/test', (_req, res) => res.json({ ok: true }));
        app.delete('/test', (_req, res) => res.json({ ok: true }));

        await request(app).post('/test').send({}).expect(200);
        await request(app).put('/test').send({}).expect(200);
        await request(app).delete('/test').expect(200);

        const logOutput = consoleOutput.join('');
        expect(logOutput).toContain('POST');
        expect(logOutput).toContain('PUT');
        expect(logOutput).toContain('DELETE');
      });
    });

    describe('skipRoutes', () => {
      it('skips configured routes including query parameters', async () => {
        app.use(morganLogger.createMiddleware({ skipRoutes: ['/health', '/ready', '/metrics'] }));
        app.get('/health', (_req, res) => res.json({ status: 'ok' }));
        app.get('/ready', (_req, res) => res.json({ ready: true }));
        app.get('/metrics', (_req, res) => res.send('metrics'));
        app.get('/api/users', (_req, res) => res.json([]));

        await request(app).get('/health').expect(200);
        await request(app).get('/ready').expect(200);
        await request(app).get('/metrics').expect(200);
        await request(app).get('/health?verbose=true').expect(200);
        await request(app).get('/api/users').expect(200);

        const logOutput = consoleOutput.join('');
        expect(logOutput).not.toContain('/health');
        expect(logOutput).not.toContain('/ready');
        expect(logOutput).not.toContain('/metrics');
        expect(logOutput).toContain('/api/users');
      });

      it('logs all routes when skipRoutes is empty', async () => {
        app.use(morganLogger.createMiddleware({ skipRoutes: [] }));
        app.get('/health', (_req, res) => res.json({ status: 'ok' }));

        await request(app).get('/health').expect(200);

        expect(consoleOutput.join('')).toContain('/health');
      });
    });

    describe('custom format', () => {
      it('respects custom log format', async () => {
        app.use(morganLogger.createMiddleware({ format: ':method :url' }));
        app.get('/custom', (_req, res) => res.json({ ok: true }));

        await request(app).get('/custom').expect(200);

        const logOutput = consoleOutput.join('');
        expect(logOutput).toContain('GET');
        expect(logOutput).toContain('/custom');
        expect(logOutput).not.toContain('ms -');
      });
    });
  });
});
