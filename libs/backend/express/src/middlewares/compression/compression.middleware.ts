import * as compressionLib from 'compression';
import type { Request, RequestHandler, Response } from 'express';

const DEFAULT_THRESHOLD = 2048;
const DEFAULT_LEVEL = 4;

type CompressionMiddlewareOptions = {
  threshold?: number;
  level?: number;
  filter?: (req: Request, res: Response) => boolean;
};

const defaultFilter = (req: Request, res: Response): boolean => {
  if (req.headers['x-no-compression']) {
    return false;
  }

  return compressionLib.filter(req, res);
};

/**
 * Creates compression Middleware.
 * @param options - Configuration options for compression
 * @property {number} [threshold=2048] - Minimum response size in bytes to compress (2KB)
 * @property {number} [level=4] - Compression level (0-9, lower = faster)
 * @property {Function} [filter] - Custom filter function to determine if response should be compressed
 * @returns Middleware
 */
const createMiddleware = (options: CompressionMiddlewareOptions = {}): RequestHandler => {
  const { threshold = DEFAULT_THRESHOLD, level = DEFAULT_LEVEL, filter = defaultFilter } = options;

  const compressionOptions: compressionLib.CompressionOptions = {
    threshold,
    level,
    filter,
  };

  return compressionLib.default(compressionOptions);
};

export const compression = {
  createMiddleware,
} as const;
