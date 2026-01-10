import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { HttpError } from '../error-handler/http-error';

/**
 * Creates a middleware that handles requests for undefined routes.
 * Returns a 404 error with route information.
 * @returns Middleware
 */
const createMiddleware = (): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const error = new HttpError(
      `Route ${req.method} ${req.path} not found`,
      `The requested endpoint ${req.method} ${req.path} does not exist`,
      404,
    );
    next(error);
  };
};

export const notFound = {
  createMiddleware,
} as const;
