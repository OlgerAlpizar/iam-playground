import type { NextFunction, Request, Response } from 'express';
import express, { Express } from 'express';
import request from 'supertest';

import { HttpError } from '../error-handler/http-error';
import { notFound } from './not-found.middleware';

type ErrorResponse = {
  message: string;
  details: string;
  statusCode: number;
};

describe('Not Found Middleware', () => {
  describe('Unit Tests', () => {
    let capturedError: HttpError | undefined;
    let mockNext: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
      capturedError = undefined;
      mockNext = jest.fn((err?: unknown) => {
        capturedError = err as HttpError | undefined;
      }) as unknown as jest.MockedFunction<NextFunction>;
    });

    it('creates middleware that throws HttpError with 404', () => {
      const middleware = notFound.createMiddleware();
      const req = { method: 'GET', path: '/unknown' } as Request;

      middleware(req, {} as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(capturedError).toBeInstanceOf(HttpError);
      expect(capturedError?.code).toBe(404);
      expect(capturedError?.message).toBe('Route GET /unknown not found');
    });

    it('includes method and path in error for all HTTP methods', () => {
      const middleware = notFound.createMiddleware();
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach((method) => {
        capturedError = undefined;
        middleware({ method, path: '/test' } as Request, {} as Response, mockNext);

        const error = capturedError as unknown as HttpError;
        expect(error.message).toContain(method);
        expect(error.message).toContain('/test');
      });
    });

    it('handles various path formats', () => {
      const middleware = notFound.createMiddleware();
      const paths = ['/', '/api/v1/users/123/posts/456/comments', '/api/search/hello%20world'];

      paths.forEach((path) => {
        capturedError = undefined;
        middleware({ method: 'GET', path } as Request, {} as Response, mockNext);

        const error = capturedError as unknown as HttpError;
        expect(error.message).toContain(path);
      });
    });
  });

  describe('Integration Tests', () => {
    let app: Express;

    const setupErrorHandler = () => {
      app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.code).json({
          message: err.message,
          details: err.details,
          statusCode: err.code,
        });
      });
    };

    beforeEach(() => {
      app = express();
    });

    describe('404 responses', () => {
      it('returns 404 for undefined routes', async () => {
        app.get('/existing', (_req, res) => res.json({ ok: true }));
        app.use(notFound.createMiddleware());
        setupErrorHandler();

        const response = await request(app).get('/non-existing').expect(404);
        const body = response.body as ErrorResponse;

        expect(body.message).toBe('Route GET /non-existing not found');
        expect(body.statusCode).toBe(404);
      });

      it('does not affect existing routes', async () => {
        app.get('/api/users', (_req, res) => res.json({ users: [] }));
        app.use(notFound.createMiddleware());
        setupErrorHandler();

        const response = await request(app).get('/api/users').expect(200);
        expect(response.body).toEqual({ users: [] });
      });

      it('returns 404 for wrong HTTP method on existing route', async () => {
        app.get('/api/users', (_req, res) => res.json({ users: [] }));
        app.use(notFound.createMiddleware());
        setupErrorHandler();

        const response = await request(app).post('/api/users').expect(404);
        expect((response.body as ErrorResponse).message).toContain('POST');
      });
    });

    describe('middleware placement', () => {
      it('must be placed after route definitions', async () => {
        app.use(notFound.createMiddleware());
        app.get('/api/users', (_req, res) => res.json({ users: [] }));
        setupErrorHandler();

        const response = await request(app).get('/api/users').expect(404);
        expect((response.body as ErrorResponse).message).toContain('not found');
      });

      it('works correctly when placed at the end', async () => {
        app.use(express.json());
        app.post('/api/items', (req, res) => {
          res.status(201).json({ created: req.body as Record<string, unknown> });
        });
        app.use(notFound.createMiddleware());
        setupErrorHandler();

        await request(app).post('/api/items').send({ name: 'test' }).expect(201);
        await request(app).get('/api/items').expect(404);
      });
    });
  });
});
