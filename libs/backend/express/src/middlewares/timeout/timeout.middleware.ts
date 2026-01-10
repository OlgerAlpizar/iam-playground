import * as timeoutLib from 'connect-timeout';
import type { RequestHandler } from 'express';

const DEFAULT_TIMEOUT = 30000;

type TimeoutOptions = {
  timeoutMs?: number;
};

/**
 * Creates a middleware that aborts requests exceeding the time limit.
 * @param options - Configuration options
 * @property {number} timeoutMs - Timeout duration in milliseconds (default: 30000)
 * @returns Middleware
 */
const createMiddleware = (options: TimeoutOptions = {}): RequestHandler => {
  const { timeoutMs = DEFAULT_TIMEOUT } = options;
  const timeoutString = `${Math.floor(timeoutMs / 1000)}s`;
  return timeoutLib.default(timeoutString);
};

export const timeout = {
  createMiddleware,
} as const;
