import type { RequestHandler } from 'express';
import passport from 'passport';

type PassportOptions = {
  configureStrategies?: () => void;
};

/**
 * Creates Passport.js initialization middleware.
 * @param options - Passport middleware options
 * @param options.configureStrategies - Optional callback to configure authentication strategies
 * @returns Middleware
 */
const createMiddleware = (options: PassportOptions = {}): RequestHandler => {
  if (options.configureStrategies) {
    options.configureStrategies();
  }
  return passport.initialize();
};

export const passportMiddleware = {
  createMiddleware,
} as const;
