import { createHash } from 'crypto';
import type { Request } from 'express';

import { generateDeviceFingerprint } from './device-fingerprint.util';

describe('generateDeviceFingerprint', () => {
  describe('Unit Tests', () => {
    const createMockRequest = (overrides: Partial<Request> = {}): Request => {
      return {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'accept-language': 'en-US',
          'accept-encoding': 'gzip, deflate',
          accept: 'text/html',
        },
        ip: '192.168.1.1',
        ...overrides,
      } as Request;
    };

    it('should generate consistent fingerprint for same request', () => {
      const req = createMockRequest();

      const result1 = generateDeviceFingerprint(req);
      const result2 = generateDeviceFingerprint(req);

      expect(result1).toBe(result2);
    });

    it('should generate a 64-character hex hash', () => {
      const req = createMockRequest();

      const result = generateDeviceFingerprint(req);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different fingerprint for different user-agent', () => {
      const req1 = createMockRequest({ headers: { 'user-agent': 'Chrome' } });
      const req2 = createMockRequest({ headers: { 'user-agent': 'Firefox' } });

      const result1 = generateDeviceFingerprint(req1);
      const result2 = generateDeviceFingerprint(req2);

      expect(result1).not.toBe(result2);
    });

    it('should generate different fingerprint for different IP', () => {
      const req1 = createMockRequest({ ip: '10.0.0.1' });
      const req2 = createMockRequest({ ip: '10.0.0.2' });

      const result1 = generateDeviceFingerprint(req1);
      const result2 = generateDeviceFingerprint(req2);

      expect(result1).not.toBe(result2);
    });

    it('should handle missing headers gracefully', () => {
      const req = createMockRequest({ headers: {}, ip: undefined });

      const result = generateDeviceFingerprint(req);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate correct fingerprint hash', () => {
      const req = createMockRequest({
        headers: {
          'user-agent': 'TestAgent',
          'accept-language': 'en',
          'accept-encoding': 'gzip',
          accept: 'text/html',
        },
        ip: '127.0.0.1',
      });

      const expectedFingerprint = createHash('sha256')
        .update('TestAgent|en|gzip|text/html|127.0.0.1')
        .digest('hex');

      const result = generateDeviceFingerprint(req);

      expect(result).toBe(expectedFingerprint);
    });
  });
});
