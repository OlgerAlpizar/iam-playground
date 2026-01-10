import express, { Express, Request } from 'express';
import request from 'supertest';

import { apiVersioning } from './api-versioning.middleware';

describe('API Versioning Middleware', () => {
  describe('Unit Tests', () => {
    describe('configuration validation', () => {
      it('throws error for invalid configurations', () => {
        expect(() =>
          apiVersioning.createMiddleware({
            versions: [{ version: 'v1' }],
            defaultVersion: 'v2',
            basePath: '/api',
          }),
        ).toThrow('Default version "v2" is not in the versions list');

        expect(() =>
          apiVersioning.createMiddleware({
            versions: [],
            defaultVersion: 'v1',
            basePath: '/api',
          }),
        ).toThrow('At least one version must be provided');

        expect(() =>
          apiVersioning.createMiddleware({
            versions: [{ version: 'v1' }],
            defaultVersion: '',
            basePath: '/api',
          }),
        ).toThrow('defaultVersion must be provided');

        expect(() =>
          apiVersioning.createMiddleware({
            versions: [{ version: 'v1', deprecated: true, sunsetDate: '2025-01-01' }],
            defaultVersion: 'v1',
            basePath: '/api',
          }),
        ).toThrow('missing deprecationDate');

        expect(() =>
          apiVersioning.createMiddleware({
            versions: [{ version: 'v1', deprecated: true, deprecationDate: '2024-01-01' }],
            defaultVersion: 'v1',
            basePath: '/api',
          }),
        ).toThrow('missing sunsetDate');
      });
    });

    describe('helper functions', () => {
      it('getVersion retrieves version from request', () => {
        const reqWithVersion = { apiVersionInfo: { version: 'v2' } } as Request;
        const reqWithout = {} as Request;

        expect(apiVersioning.getVersion(reqWithVersion)).toBe('v2');
        expect(apiVersioning.getVersion(reqWithout)).toBeUndefined();
      });

      it('isDeprecated checks deprecation status', () => {
        const deprecated = { apiVersionInfo: { version: 'v1', deprecated: true } } as Request;
        const active = { apiVersionInfo: { version: 'v2', deprecated: false } } as Request;
        const noInfo = {} as Request;

        expect(apiVersioning.isDeprecated(deprecated)).toBe(true);
        expect(apiVersioning.isDeprecated(active)).toBe(false);
        expect(apiVersioning.isDeprecated(noInfo)).toBe(false);
      });
    });
  });

  describe('Integration Tests', () => {
    let app: Express;

    beforeEach(() => {
      app = express();
    });

    describe('version extraction', () => {
      it('extracts version from URL and uses default when not specified', async () => {
        app.use(
          apiVersioning.createMiddleware({
            versions: [{ version: 'v1' }, { version: 'v2' }],
            defaultVersion: 'v2',
            basePath: '/api',
          }),
        );
        app.get('/api/v1/users', (req, res) => res.json({ version: req.apiVersionInfo?.version }));
        app.get('/api/users', (req, res) => res.json({ version: req.apiVersionInfo?.version }));

        const v1 = await request(app).get('/api/v1/users').expect(200);
        const def = await request(app).get('/api/users').expect(200);

        expect((v1.body as { version: string }).version).toBe('v1');
        expect((def.body as { version: string }).version).toBe('v2');
      });

      it('rejects unsupported versions', async () => {
        app.use(
          apiVersioning.createMiddleware({
            versions: [{ version: 'v1' }, { version: 'v2' }],
            defaultVersion: 'v1',
            basePath: '/api',
          }),
        );
        app.get('/api/v3/users', (_req, res) => res.json({ ok: true }));

        const response = await request(app).get('/api/v3/users').expect(400);

        expect((response.body as { error: string }).error).toBe('Unsupported API version');
        expect((response.body as { supportedVersions: string[] }).supportedVersions).toEqual([
          'v1',
          'v2',
        ]);
      });

      it('works with custom base path', async () => {
        app.use(
          apiVersioning.createMiddleware({
            versions: [{ version: 'v1' }],
            defaultVersion: 'v1',
            basePath: '/custom',
          }),
        );
        app.get('/custom/v1/users', (req, res) =>
          res.json({ version: req.apiVersionInfo?.version }),
        );

        const response = await request(app).get('/custom/v1/users').expect(200);
        expect((response.body as { version: string }).version).toBe('v1');
      });
    });

    describe('deprecation handling', () => {
      it('sets deprecation headers for deprecated versions', async () => {
        app.use(
          apiVersioning.createMiddleware({
            versions: [
              {
                version: 'v1',
                deprecated: true,
                deprecationDate: '2024-01-01',
                sunsetDate: '2030-12-31',
              },
              { version: 'v2' },
            ],
            defaultVersion: 'v1',
            basePath: '/api',
          }),
        );
        app.get('/api/v1/users', (_req, res) => res.json({ ok: true }));

        const response = await request(app).get('/api/v1/users').expect(200);

        expect(response.headers['x-api-deprecated']).toBe('true');
        expect(response.headers['x-api-deprecation-date']).toBe('2024-01-01');
        expect(response.headers['x-api-sunset-date']).toBe('2030-12-31');
      });

      it('returns 410 Gone for sunset versions', async () => {
        app.use(
          apiVersioning.createMiddleware({
            versions: [
              {
                version: 'v1',
                deprecated: true,
                deprecationDate: '2020-01-01',
                sunsetDate: '2020-12-31',
              },
              { version: 'v2' },
            ],
            defaultVersion: 'v1',
            basePath: '/api',
          }),
        );
        app.get('/api/v1/users', (_req, res) => res.json({ ok: true }));

        const response = await request(app).get('/api/v1/users').expect(410);

        expect((response.body as { error: string }).error).toBe('API version sunset');
        expect((response.body as { message: string }).message).toContain(
          'was sunset on 2020-12-31',
        );
      });
    });
  });
});
