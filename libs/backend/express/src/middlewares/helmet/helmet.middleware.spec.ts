import express, { Express } from 'express';
import request from 'supertest';

import { helmet } from './helmet.middleware';

describe('Helmet Middleware', () => {
  describe('Unit Tests', () => {
    it('creates middleware with default and custom options', () => {
      const defaultMiddleware = helmet.createMiddleware();
      const customMiddleware = helmet.createMiddleware({
        contentSecurityPolicy: false,
        hsts: { maxAge: 86400 },
        frameguard: { action: 'deny' },
      });

      expect(defaultMiddleware).not.toBe(customMiddleware);
    });
  });

  describe('Integration Tests', () => {
    let app: Express;

    beforeEach(() => {
      app = express();
      app.use(helmet.createMiddleware());
      app.get('/test', (_req, res) => res.json({ message: 'ok' }));
    });

    describe('default security headers', () => {
      it('sets all default security headers', async () => {
        const response = await request(app).get('/test').expect(200);

        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-dns-prefetch-control']).toBe('off');
        expect(response.headers['x-download-options']).toBe('noopen');
        expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
        expect(response.headers['x-powered-by']).toBeUndefined();
        expect(response.headers['strict-transport-security']).toContain('max-age=');
        expect(response.headers['x-xss-protection']).toBe('0');
        expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
        expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
        expect(response.headers['origin-agent-cluster']).toBe('?1');
        expect(response.headers['referrer-policy']).toBe('no-referrer');
        expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
      });
    });

    describe('custom options', () => {
      it('disables specific headers when configured', async () => {
        const customApp = express();
        customApp.use(
          helmet.createMiddleware({
            contentSecurityPolicy: false,
            hsts: false,
            frameguard: false,
            noSniff: false,
            dnsPrefetchControl: false,
          }),
        );
        customApp.get('/test', (_req, res) => res.json({ message: 'ok' }));

        const response = await request(customApp).get('/test').expect(200);

        expect(response.headers['content-security-policy']).toBeUndefined();
        expect(response.headers['strict-transport-security']).toBeUndefined();
        expect(response.headers['x-frame-options']).toBeUndefined();
        expect(response.headers['x-content-type-options']).toBeUndefined();
        expect(response.headers['x-dns-prefetch-control']).toBeUndefined();
      });

      it('applies custom header values', async () => {
        const customApp = express();
        customApp.use(
          helmet.createMiddleware({
            frameguard: { action: 'deny' },
            hsts: { maxAge: 86400 },
            referrerPolicy: { policy: 'strict-origin' },
            dnsPrefetchControl: { allow: true },
          }),
        );
        customApp.get('/test', (_req, res) => res.json({ message: 'ok' }));

        const response = await request(customApp).get('/test').expect(200);

        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['strict-transport-security']).toContain('max-age=86400');
        expect(response.headers['referrer-policy']).toBe('strict-origin');
        expect(response.headers['x-dns-prefetch-control']).toBe('on');
      });
    });
  });
});
