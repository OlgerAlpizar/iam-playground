import type { RequestHandler } from 'express';
import * as helmetLib from 'helmet';

type HelmetOptions = Parameters<typeof helmetLib.default>[0];

/**
 * Creates Helmet middleware for securing HTTP headers.
 * @param options - Helmet configuration options
 * @property {boolean} [contentSecurityPolicy=true] - Enable Content Security Policy
 * @property {boolean} [crossOriginEmbedderPolicy=true] - Enable Cross-Origin Embedder Policy
 * @property {boolean} [crossOriginOpenerPolicy=true] - Enable Cross-Origin Opener Policy
 * @property {boolean} [crossOriginResourcePolicy=true] - Enable Cross-Origin Resource Policy
 * @property {boolean} [dnsPrefetchControl=true] - Enable DNS Prefetch Control
 * @property {boolean} [frameguard=true] - Enable X-Frame-Options
 * @property {boolean} [hidePoweredBy=true] - Remove X-Powered-By header
 * @property {boolean} [hsts=true] - Enable Strict Transport Security
 * @property {boolean} [ieNoOpen=true] - Enable X-Download-Options for IE8+
 * @property {boolean} [noSniff=true] - Enable X-Content-Type-Options
 * @property {boolean} [originAgentCluster=true] - Enable Origin-Agent-Cluster header
 * @property {boolean} [permittedCrossDomainPolicies=true] - Enable X-Permitted-Cross-Domain-Policies
 * @property {boolean} [referrerPolicy=true] - Enable Referrer-Policy
 * @property {boolean} [xssFilter=true] - Enable X-XSS-Protection
 * @returns Middleware
 */
const createMiddleware = (options: HelmetOptions = {}): RequestHandler => {
  return helmetLib.default(options);
};

export const helmet = {
  createMiddleware,
} as const;
