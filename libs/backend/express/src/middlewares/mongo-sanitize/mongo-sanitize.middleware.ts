import type { RequestHandler } from 'express';
import mongoSanitizeLib from 'express-mongo-sanitize';

type MongoSanitizeOptions = {
  replaceWith?: string;
  allowDots?: boolean;
  dryRun?: boolean;
};

/**
 * Creates MongoDB sanitization middleware to prevent NoSQL injection attacks.
 * Removes any keys that start with $ or contain . from user-supplied input
 * Should be applied after body parser but before routes.
 * @param options - Configuration options for sanitization
 * @property {string} [replaceWith] - Character to replace prohibited characters with (default: remove)
 * @property {boolean} [allowDots=false] - Whether to allow dots in keys
 * @property {boolean} [dryRun=false] - If true, only report what would be sanitized without modifying
 * @returns Middleware
 */
const createMiddleware = (options: MongoSanitizeOptions = {}): RequestHandler => {
  return mongoSanitizeLib(options);
};

export const mongoSanitize = {
  createMiddleware,
} as const;
