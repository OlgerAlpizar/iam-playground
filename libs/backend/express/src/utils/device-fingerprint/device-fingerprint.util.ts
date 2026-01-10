import { createHash } from 'crypto';
import type { Request } from 'express';

/**
 * Generates a device fingerprint based on request headers and IP.
 * Uses SHA256 hash of combined request characteristics.
 * @param req - Express request object
 * @returns Hashed device fingerprint
 */
export const generateDeviceFingerprint = (req: Request): string => {
  const components = [
    req.headers['user-agent'] ?? '',
    req.headers['accept-language'] ?? '',
    req.headers['accept-encoding'] ?? '',
    req.headers['accept'] ?? '',
    req.ip ?? '',
  ];

  const fingerprint = components.join('|');

  return createHash('sha256').update(fingerprint).digest('hex');
};
