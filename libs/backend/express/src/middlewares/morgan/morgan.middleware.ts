import type { Request, RequestHandler, Response } from 'express';
import morgan from 'morgan';

import { getHttpRequestId } from '../../utils/get-http-request-id/get-http-request-id.util';

const DEFAULT_FORMAT = ':method :url :status :response-time ms - :request-id';
const DEFAULT_SKIP_ROUTES = ['/health'];

type MorganOptions = {
  format?: string;
  skipRoutes?: string[];
};

morgan.token('request-id', (req: Request) => {
  return getHttpRequestId(req);
});

const createSkipFunction = (routes: string[]) => {
  return (req: Request, _res: Response): boolean => {
    return routes.some((route) => req.url === route || req.url.startsWith(`${route}?`));
  };
};

/**
 * Creates Morgan HTTP request logger middleware
 * Includes custom request-id token in logs.
 * @param options - Configuration options for Morgan
 * @property {string} [format] - Morgan log format string (default: ':method :url :status :response-time ms - :request-id')
 * @property {string[]} [skipRoutes=['/health']] - Routes to skip logging
 * @returns Middleware
 */
const createMiddleware = (options: MorganOptions = {}): RequestHandler => {
  const { format = DEFAULT_FORMAT, skipRoutes = DEFAULT_SKIP_ROUTES } = options;

  const skip = skipRoutes.length > 0 ? createSkipFunction(skipRoutes) : undefined;

  return morgan(format, { skip });
};

export const morganLogger = {
  createMiddleware,
} as const;
