import type { RequestHandler } from 'express';
import * as hppLib from 'hpp';

type HppOptions = {
  whitelist?: string | string[];
  checkBody?: boolean;
  checkQuery?: boolean;
};

/**
 * Protects against HTTP Parameter Pollution attacks by selecting
 * the last parameter value when duplicates are found.
 * @param options - HPP configuration options
 * @property {string|string[]} [whitelist] - Parameter names to whitelist (allow duplicates)
 * @property {boolean} [checkBody=true] - Check req.body for duplicates
 * @property {boolean} [checkQuery=true] - Check req.query for duplicates
 * @returns Middleware
 */
const createMiddleware = (options: HppOptions = {}): RequestHandler => {
  return hppLib.default(options);
};

export const hpp = {
  createMiddleware,
} as const;
