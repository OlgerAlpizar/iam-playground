import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { HttpError } from '../error-handler/http-error';
import { requestValidation } from './request-validation.middleware';

type MockNextFunction = jest.Mock<void, [Error?]> & NextFunction;

const createMockRequest = (overrides?: Partial<Request>): Request =>
  ({ headers: {}, body: {}, query: {}, params: {}, ...overrides } as Request);

const createMockResponse = (): Response =>
  ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as unknown as Response);

const createMockNext = (): MockNextFunction => jest.fn() as MockNextFunction;

const getNextError = <T extends Error>(next: MockNextFunction): T => {
  const calls = next.mock.calls as Array<[T?]>;
  return calls[0][0] as T;
};

describe('Request Validation Middleware', () => {
  describe('Unit Tests', () => {
    describe('body validation', () => {
      it('validates and passes valid body data', () => {
        const schema = z.object({ name: z.string(), age: z.number() });
        const middleware = requestValidation.createMiddleware({ body: schema });
        const req = createMockRequest({ body: { name: 'John', age: 30 } });
        const next = createMockNext();

        middleware(req, createMockResponse(), next);

        expect(next).toHaveBeenCalledWith();
        expect(req.body).toEqual({ name: 'John', age: 30 });
      });

      it('throws HttpError 400 on validation failure', () => {
        const schema = z.object({ name: z.string(), age: z.number() });
        const middleware = requestValidation.createMiddleware({ body: schema });
        const req = createMockRequest({ body: { name: 'John', age: 'invalid' } });
        const next = createMockNext();

        middleware(req, createMockResponse(), next);

        const error = getNextError<HttpError>(next);
        expect(error).toBeInstanceOf(HttpError);
        expect(error.code).toBe(400);
        expect(error.message).toBe('Validation error');
      });

      it('includes field name in validation error details', () => {
        const schema = z.object({ email: z.string().email() });
        const middleware = requestValidation.createMiddleware({ body: schema });
        const req = createMockRequest({ body: { email: 'invalid' } });
        const next = createMockNext();

        middleware(req, createMockResponse(), next);

        expect(getNextError<HttpError>(next).details).toContain('email');
      });
    });

    describe('query validation', () => {
      it('validates query parameters', () => {
        const schema = z.object({ page: z.string(), limit: z.string() });
        const middleware = requestValidation.createMiddleware({ query: schema });
        const req = createMockRequest({ query: { page: '1', limit: '10' } });
        const next = createMockNext();

        middleware(req, createMockResponse(), next);

        expect(next).toHaveBeenCalledWith();
        expect(req.query).toEqual({ page: '1', limit: '10' });
      });
    });

    describe('params validation', () => {
      it('validates route parameters', () => {
        const schema = z.object({ id: z.string() });
        const middleware = requestValidation.createMiddleware({ params: schema });
        const req = createMockRequest({ params: { id: '123' } });
        const next = createMockNext();

        middleware(req, createMockResponse(), next);

        expect(next).toHaveBeenCalledWith();
      });
    });

    describe('combined validation', () => {
      it('validates body, query, and params simultaneously', () => {
        const middleware = requestValidation.createMiddleware({
          body: z.object({ name: z.string() }),
          query: z.object({ page: z.string() }),
          params: z.object({ id: z.string() }),
        });
        const req = createMockRequest({
          body: { name: 'John' },
          query: { page: '1' },
          params: { id: '123' },
        });
        const next = createMockNext();

        middleware(req, createMockResponse(), next);

        expect(next).toHaveBeenCalledWith();
      });

      it('passes through when no schemas provided', () => {
        const middleware = requestValidation.createMiddleware({});
        const req = createMockRequest({ body: { anything: 'goes' } });
        const next = createMockNext();

        middleware(req, createMockResponse(), next);

        expect(next).toHaveBeenCalledWith();
      });
    });

    describe('complex schemas', () => {
      it('handles nested objects, arrays, and defaults', () => {
        const schema = z.object({
          user: z.object({ name: z.string(), email: z.string().email() }),
          tags: z.array(z.string()),
          role: z.string().default('user'),
        });
        const middleware = requestValidation.createMiddleware({ body: schema });
        const req = createMockRequest({
          body: {
            user: { name: 'John', email: 'john@example.com' },
            tags: ['dev', 'nodejs'],
          },
        });
        const next = createMockNext();

        middleware(req, createMockResponse(), next);

        expect(next).toHaveBeenCalledWith();
        expect((req.body as { role: string }).role).toBe('user');
      });

      it('re-throws non-Zod errors as-is', () => {
        const badSchema = {
          parse: () => {
            throw new Error('Generic error');
          },
        } as unknown as z.ZodSchema;
        const middleware = requestValidation.createMiddleware({ body: badSchema });
        const next = createMockNext();

        middleware(createMockRequest(), createMockResponse(), next);

        const error = getNextError<Error>(next);
        expect(error).toBeInstanceOf(Error);
        expect(error).not.toBeInstanceOf(HttpError);
      });
    });
  });
});
