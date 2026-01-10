import { environment } from '@authentication/backend-utils';
import type { Request, RequestHandler, Response } from 'express';
import rateLimitLib from 'express-rate-limit';

import { generateDeviceFingerprint } from '../../utils/device-fingerprint/device-fingerprint.util';

const DEFAULT_WINDOW_MS = 600000;
const DEFAULT_API_MAX_ATTEMPTS = 100;
const DEFAULT_AUTH_MAX_ATTEMPTS = 10;

type RateLimitInfo = {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date | undefined;
};

type RateLimitRequest = Request & {
  rateLimit?: RateLimitInfo;
};

type BaseRateLimitOptions = {
  windowMs?: number;
  max?: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
};

type ApiLimiterOptions = BaseRateLimitOptions;

type AuthLimiterOptions = BaseRateLimitOptions & {
  skipSuccessfulRequests?: boolean;
};

type RequestWithUser = Request & {
  user?: { id?: string };
};

const generateRateLimitKey = (req: Request, prefix: string, identifier?: string): string => {
  const user = (req as RequestWithUser).user;

  if (user?.id) {
    return `${prefix}:user:${user.id}`;
  }

  if (identifier) {
    return `${prefix}:identifier:${identifier}`;
  }

  const fingerprint = generateDeviceFingerprint(req);
  return `${prefix}:device:${fingerprint}`;
};

const createHandler = (errorMessage: string) => {
  return (req: Request, res: Response): void => {
    const rateLimitReq = req as RateLimitRequest;
    const resetTime = rateLimitReq.rateLimit?.resetTime;
    const retryAfter = resetTime ? Math.ceil((resetTime.getTime() - Date.now()) / 1000) : undefined;

    res.status(429).json({
      error: errorMessage,
      ...(retryAfter !== undefined && { retryAfter }),
    });
  };
};

/**
 * Creates a regular API rate limiter middleware.
 * Limits API requests based on device fingerprint.
 * @param options - Configuration options
 * @returns Middleware
 */
const createApiLimiterMiddleware = (options: ApiLimiterOptions = {}): RequestHandler => {
  const {
    windowMs = DEFAULT_WINDOW_MS,
    max = DEFAULT_API_MAX_ATTEMPTS * (environment.isProduction() ? 1 : 10),
    message = 'Too many requests from this device, please try again later.',
    standardHeaders = true,
    legacyHeaders = false,
  } = options;

  return rateLimitLib({
    windowMs,
    max,
    message: { error: message },
    standardHeaders,
    legacyHeaders,
    keyGenerator: (req: Request) => generateRateLimitKey(req, 'api'),
    handler: createHandler(message),
    validate: { xForwardedForHeader: false },
  });
};

/**
 * Creates an authentication rate limiter middleware.
 * Limits failed auth attempts based on user ID, email/username, or device fingerprint.
 * @param options - Configuration options
 * @returns Middleware
 */
const createAuthLimiterMiddleware = (options: AuthLimiterOptions = {}): RequestHandler => {
  const {
    windowMs = DEFAULT_WINDOW_MS,
    max = DEFAULT_AUTH_MAX_ATTEMPTS * (environment.isProduction() ? 1 : 10),
    message = 'Too many authentication attempts, please try again later.',
    standardHeaders = true,
    legacyHeaders = false,
    skipSuccessfulRequests = true,
  } = options;

  return rateLimitLib({
    windowMs,
    max,
    message: { error: message },
    standardHeaders,
    legacyHeaders,
    skipSuccessfulRequests,
    keyGenerator: (req: Request) => {
      const body = req.body as { email?: string; username?: string } | undefined;
      const identifier = body?.email ?? body?.username;
      return generateRateLimitKey(req, 'auth', identifier);
    },
    handler: createHandler(message),
    validate: { xForwardedForHeader: false },
  });
};

export const rateLimit = {
  createApiLimiterMiddleware,
  createAuthLimiterMiddleware,
} as const;
