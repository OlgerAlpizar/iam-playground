import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodError, ZodSchema } from 'zod';

import { HttpError } from '../error-handler/http-error';

type ValidationOptions = {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
};

const handleValidationError = (error: unknown, next: NextFunction): void => {
  if ((error as ZodError).issues) {
    const zodError = error as ZodError;
    const details = zodError.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    return next(new HttpError('Validation error', details, 400));
  }
  next(error);
};

/**
 * Validates request body, query, or params using Zod schemas.
 * @param options - Validation options
 * @property {ZodSchema} body - Schema for request body validation
 * @property {ZodSchema} query - Schema for query parameters validation
 * @property {ZodSchema} params - Schema for route params validation
 * @returns Middleware
 */
export const validate = (options: ValidationOptions): RequestHandler => {
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
      handleValidationError(error, next);
    }
  };
};

/**
 * Validates request body using a Zod schema.
 * @param schema - Zod schema for body validation
 * @returns Middleware
 */
export const validateBody = (schema: ZodSchema): RequestHandler => validate({ body: schema });

/**
 * Validates query parameters using a Zod schema.
 * @param schema - Zod schema for query validation
 * @returns Middleware
 */
export const validateQuery = (schema: ZodSchema): RequestHandler => validate({ query: schema });

/**
 * Validates route params using a Zod schema.
 * @param schema - Zod schema for params validation
 * @returns Middleware
 */
export const validateParams = (schema: ZodSchema): RequestHandler => validate({ params: schema });

export const requestValidation = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
};
