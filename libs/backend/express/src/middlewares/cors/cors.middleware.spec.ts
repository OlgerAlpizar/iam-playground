import express, { Express } from 'express';
import request from 'supertest';

jest.mock('@authentication/backend-utils', () => ({
  environment: {
    isDevelopment: jest.fn(() => false),
  },
}));

import { environment } from '@authentication/backend-utils';

import { cors } from './cors.middleware';

const mockEnvironment = jest.mocked(environment);

describe('CORS Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnvironment.isDevelopment.mockReturnValue(false);
  });

  describe('Unit Tests', () => {
    it('throws when whiteListUrls is empty in production', () => {
      mockEnvironment.isDevelopment.mockReturnValue(false);
      expect(() => cors.createMiddleware({ whiteListUrls: [] })).toThrow(
        'CORS: whiteListUrls must be provided in non-development environments',
      );
    });

    it('allows empty whiteListUrls in development', () => {
      mockEnvironment.isDevelopment.mockReturnValue(true);
      expect(() => cors.createMiddleware({ whiteListUrls: [] })).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    let app: Express;

    beforeEach(() => {
      app = express();
    });

    describe('development mode', () => {
      it('allows all origins with credentials', async () => {
        mockEnvironment.isDevelopment.mockReturnValue(true);
        app.use(cors.createMiddleware({ whiteListUrls: [] }));
        app.get('/test', (_req, res) => res.json({ ok: true }));

        const response = await request(app)
          .get('/test')
          .set('Origin', 'http://localhost:3000')
          .expect(200);

        expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
        expect(response.headers['access-control-allow-credentials']).toBe('true');
      });
    });

    describe('production mode', () => {
      it('allows whitelisted origins only', async () => {
        mockEnvironment.isDevelopment.mockReturnValue(false);
        app.use(cors.createMiddleware({ whiteListUrls: ['http://example.com'] }));
        app.get('/test', (_req, res) => res.json({ ok: true }));

        const allowed = await request(app)
          .get('/test')
          .set('Origin', 'http://example.com')
          .expect(200);
        expect(allowed.headers['access-control-allow-origin']).toBe('http://example.com');

        const rejected = await request(app)
          .get('/test')
          .set('Origin', 'http://malicious.com')
          .expect(500);
        expect(rejected.text).toContain('not allowed');
      });

      it('rejects requests without origin header', async () => {
        mockEnvironment.isDevelopment.mockReturnValue(false);
        app.use(cors.createMiddleware({ whiteListUrls: ['http://example.com'] }));
        app.get('/test', (_req, res) => res.json({ ok: true }));

        const response = await request(app).get('/test').expect(500);
        expect(response.text).toContain('Origin header is required');
      });
    });

    describe('preflight requests', () => {
      it('handles OPTIONS with correct headers', async () => {
        mockEnvironment.isDevelopment.mockReturnValue(false);
        app.use(cors.createMiddleware({ whiteListUrls: ['http://example.com'] }));
        app.get('/test', (_req, res) => res.json({ ok: true }));

        const response = await request(app)
          .options('/test')
          .set('Origin', 'http://example.com')
          .set('Access-Control-Request-Method', 'GET')
          .expect(204);

        expect(response.headers['access-control-allow-methods']).toBe(
          'GET,POST,PUT,DELETE,PATCH,OPTIONS',
        );
        expect(response.headers['access-control-allow-headers']).toBe(
          'Content-Type,Authorization,X-Request-Id',
        );
        expect(response.headers['access-control-max-age']).toBe('3600');
        expect(response.headers['access-control-expose-headers']).toBe('X-Request-Id');
      });
    });
  });
});
