import type { Request } from 'express';

/**
 * Gets the HTTP request ID from various possible sources
 * @param req - Express request object
 * @returns The request ID string
 */
export function getHttpRequestId(req: Request): string {
  if (req.id && req.id.trim() !== '') {
    return req.id;
  }
  if (req.requestId && req.requestId.trim() !== '') {
    return req.requestId;
  }
  const headerId = req.headers?.['x-request-id'];
  if (typeof headerId === 'string' && headerId.trim() !== '') {
    return headerId;
  }
  return 'unknown';
}
