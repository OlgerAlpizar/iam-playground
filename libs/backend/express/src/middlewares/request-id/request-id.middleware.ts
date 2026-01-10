import { randomUUID } from 'crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

const DEFAULT_HEADER_NAME = 'X-Request-Id';
const DEFAULT_ATTRIBUTE_NAME = 'id';

type RequestIdOptions = {
  headerName?: string;
  attributeName?: string;
  generator?: () => string;
  setHeader?: boolean;
};

const defaultGenerator = (): string => {
  return randomUUID();
};

/**
 * Creates a middleware that generates or uses existing request IDs.
 * Attaches unique request ID to each request for tracking and logging purposes.
 * @param options - Configuration options
 * @property {string} headerName - Header name for request ID (default: 'X-Request-Id')
 * @property {string} attributeName - Request property name (default: 'id')
 * @property {() => string} generator - Custom ID generator function
 * @property {boolean} setHeader - Whether to set response header (default: true)
 * @returns Middleware
 */
const createMiddleware = (options: RequestIdOptions = {}): RequestHandler => {
  const {
    headerName = DEFAULT_HEADER_NAME,
    attributeName = DEFAULT_ATTRIBUTE_NAME,
    generator = defaultGenerator,
    setHeader = true,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const existingId = req.headers[headerName.toLowerCase()] as string;
    const requestId = existingId ?? generator();
    (req as Request & Record<string, unknown>)[attributeName] = requestId;

    if (attributeName !== 'requestId') {
      req.requestId = requestId;
    }

    if (setHeader) {
      res.setHeader(headerName, requestId);
    }

    next();
  };
};

export const requestId = {
  createMiddleware,
} as const;
