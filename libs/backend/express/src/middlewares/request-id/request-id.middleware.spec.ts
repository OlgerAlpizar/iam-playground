import type { Express, NextFunction, Request, Response } from 'express';
import express from 'express';
import request from 'supertest';

import { getHttpRequestId } from '../../utils/get-http-request-id/get-http-request-id.util';
import { requestId } from './request-id.middleware';

type RequestIdResponse = {
  requestId?: string;
};

describe('Request ID Middleware', () => {
  describe('Unit Tests', () => {
    describe('getHttpRequestId utility', () => {
      it('retrieves request ID with priority: req.id > req.requestId > header', () => {
        expect(getHttpRequestId({ id: 'id-1', requestId: 'id-2' } as unknown as Request)).toBe(
          'id-1',
        );
        expect(getHttpRequestId({ requestId: 'id-2' } as unknown as Request)).toBe('id-2');
        expect(
          getHttpRequestId({ headers: { 'x-request-id': 'id-3' } } as unknown as Request),
        ).toBe('id-3');
      });

      it('returns "unknown" when no request ID exists', () => {
        expect(getHttpRequestId({} as unknown as Request)).toBe('unknown');
      });

      it('skips empty or whitespace-only values', () => {
        const req = {
          id: '   ',
          requestId: '',
          headers: { 'x-request-id': '' },
        } as unknown as Request;
        expect(getHttpRequestId(req)).toBe('unknown');
      });
    });
  });

  describe('Integration Tests', () => {
    let app: Express;

    beforeEach(() => {
      app = express();
      app.use(requestId.createMiddleware());
    });

    describe('request ID generation', () => {
      it('generates unique UUIDs for each request', async () => {
        app.get('/test', (req, res) => res.json({ requestId: req.id }));

        const [r1, r2] = await Promise.all([
          request(app).get('/test').expect(200),
          request(app).get('/test').expect(200),
        ]);

        const body1 = r1.body as RequestIdResponse;
        const body2 = r2.body as RequestIdResponse;

        expect(body1.requestId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
        expect(body1.requestId).not.toBe(body2.requestId);
      });

      it('sets X-Request-Id in response header', async () => {
        app.get('/test', (_req, res) => res.json({ ok: true }));

        const response = await request(app).get('/test').expect(200);

        expect(response.headers['x-request-id']).toBeDefined();
      });

      it('stores ID in both req.id and req.requestId', async () => {
        app.get('/test', (req, res) => res.json({ id: req.id, requestId: req.requestId }));

        const response = await request(app).get('/test').expect(200);
        const body = response.body as { id: string; requestId: string };

        expect(body.id).toBeDefined();
        expect(body.requestId).toBeDefined();
        expect(body.id).toBe(body.requestId);
      });

      it('uses existing request ID from header', async () => {
        const customId = 'custom-request-id-12345';
        app.get('/test', (req, res) => res.json({ requestId: req.id }));

        const response = await request(app).get('/test').set('X-Request-Id', customId).expect(200);

        expect((response.body as RequestIdResponse).requestId).toBe(customId);
        expect(response.headers['x-request-id']).toBe(customId);
      });
    });

    describe('custom options', () => {
      it('uses custom header and attribute names', async () => {
        const customApp = express();
        customApp.use(
          requestId.createMiddleware({
            headerName: 'X-Correlation-Id',
            attributeName: 'correlationId',
          }),
        );
        customApp.get('/test', (req, res) => {
          const id = (req as Request & { correlationId?: string }).correlationId;
          res.json({ correlationId: id });
        });

        const response = await request(customApp).get('/test').expect(200);

        expect(response.headers['x-correlation-id']).toBeDefined();
        expect(response.headers['x-request-id']).toBeUndefined();
        expect((response.body as { correlationId: string }).correlationId).toBeDefined();
      });

      it('uses custom generator function', async () => {
        let counter = 0;
        const customApp = express();
        customApp.use(requestId.createMiddleware({ generator: () => `custom-${++counter}` }));
        customApp.get('/test', (req, res) => res.json({ requestId: req.id }));

        const r1 = await request(customApp).get('/test').expect(200);
        const r2 = await request(customApp).get('/test').expect(200);

        expect((r1.body as RequestIdResponse).requestId).toBe('custom-1');
        expect((r2.body as RequestIdResponse).requestId).toBe('custom-2');
      });

      it('respects setHeader option', async () => {
        const customApp = express();
        customApp.use(requestId.createMiddleware({ setHeader: false }));
        customApp.get('/test', (req, res) => res.json({ requestId: req.id }));

        const response = await request(customApp).get('/test').expect(200);

        expect((response.body as RequestIdResponse).requestId).toBeDefined();
        expect(response.headers['x-request-id']).toBeUndefined();
      });
    });

    describe('error handling integration', () => {
      it('makes request ID accessible in error handlers', async () => {
        app.get('/error', (req, _res, next) => {
          const error = new Error('Test') as Error & { requestId?: string };
          error.requestId = req.id;
          next(error);
        });
        app.use(
          (
            err: Error & { requestId?: string },
            _req: Request,
            res: Response,
            _next: NextFunction,
          ) => {
            res.status(500).json({ error: err.message, requestId: err.requestId });
          },
        );

        const response = await request(app).get('/error').expect(500);

        expect((response.body as { requestId: string }).requestId).toBeDefined();
      });
    });
  });
});
