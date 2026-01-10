import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodError, ZodSchema } from 'zod';

import { HttpError } from '../error-handler/http-error';

type ValidationOptions = {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
};

/**
 * Creates a validation middleware using Zod schemas.
 * Validates request body, query, or params based on the provided schema.
 * @param options - Validation options
 * @property {ZodSchema} body - Schema for request body validation
 * @property {ZodSchema} query - Schema for query parameters validation
 * @property {ZodSchema} params - Schema for route params validation
 * @returns Middleware
 */
const createMiddleware = (options: ValidationOptions): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (options.body) {
        req.body = options.body.parse(req.body) as unknown as Record<string, unknown>;
      }
      if (options.query) {
        req.query = options.query.parse(req.query) as Request['query'];
      }
      if (options.params) {
        req.params = options.params.parse(req.params) as Request['params'];
      }
      next();
    } catch (error) {
      if ((error as ZodError).issues) {
        const zodError = error as ZodError;
        const details = zodError.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        const validationError = new HttpError('Validation error', details, 400);
        return next(validationError);
      }
      next(error);
    }
  };
};

export const requestValidation = {
  createMiddleware,
} as const;
