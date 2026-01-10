import { environment } from '@authentication/backend-utils';
import * as corsLib from 'cors';
import type { RequestHandler } from 'express';

type StaticOrigin = boolean | string | RegExp | (boolean | string | RegExp)[];

type CorsCallback = (err: Error | null, origins?: StaticOrigin) => void;

type OriginType = string | undefined;

type CorsMiddlewareOptions = {
  whiteListUrls: string[];
};

const validateOptions = (options: CorsMiddlewareOptions): void => {
  if (!environment.isDevelopment()) {
    if (!options.whiteListUrls || options.whiteListUrls.length === 0) {
      throw new Error('CORS: whiteListUrls must be provided in non-development environments');
    }
  }
};

const createCorsOptions = (options: CorsMiddlewareOptions): corsLib.CorsOptions => {
  return {
    origin: (origin: OriginType, callback: CorsCallback) => {
      if (environment.isDevelopment()) {
        return callback(null, true);
      }

      if (!origin) {
        return callback(
          new Error('CORS: Origin header is required in any non-development environment'),
          false,
        );
      }

      if (!options.whiteListUrls.includes(origin)) {
        return callback(
          new Error(
            `CORS: Origin '${origin}' is not allowed. Allowed origins: ${options.whiteListUrls.join(
              ', ',
            )}`,
          ),
          false,
        );
      }

      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 3600, // 1 hour - cache OPTIONS preflight requests
  };
};

/**
 * Creates CORS Middleware.
 * @param options - Configuration options for CORS
 * @property {string[]} whiteListUrls - Array of allowed origin URLs
 * @returns Middleware
 */
const createMiddleware = (options: CorsMiddlewareOptions): RequestHandler => {
  validateOptions(options);
  const corsOptions = createCorsOptions(options);
  return corsLib.default(corsOptions);
};

export const cors = {
  createMiddleware,
} as const;
