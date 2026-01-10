import type { Request } from 'express';

import { getHttpRequestId } from './get-http-request-id.util';

describe('getHttpRequestId', () => {
  describe('Unit Tests', () => {
    it('should return req.id when it exists', () => {
      const mockReq = { id: 'test-id' } as Request;
      expect(getHttpRequestId(mockReq)).toBe('test-id');
    });

    it('should return req.id even when req.requestId exists', () => {
      const mockReq = { id: 'test-id', requestId: 'other-id' } as Request;
      expect(getHttpRequestId(mockReq)).toBe('test-id');
    });

    it('should return unknown when req.id is undefined', () => {
      const mockReq = { id: undefined } as Request;
      expect(getHttpRequestId(mockReq)).toBe('unknown');
    });

    it('should return req.requestId when it exists and req.id is undefined', () => {
      const mockReq = { requestId: 'request-id' } as Request;
      expect(getHttpRequestId(mockReq)).toBe('request-id');
    });

    it('should return unknown when no request ID sources are available', () => {
      const mockReq = {} as Request;
      expect(getHttpRequestId(mockReq)).toBe('unknown');
    });

    it('should return unknown when req.requestId is undefined', () => {
      const mockReq = { requestId: undefined } as Request;
      expect(getHttpRequestId(mockReq)).toBe('unknown');
    });

    it('should return x-request-id header when other sources are undefined', () => {
      const mockReq = {
        headers: { 'x-request-id': 'header-id' },
      } as unknown as Request;
      expect(getHttpRequestId(mockReq)).toBe('header-id');
    });
  });
});
