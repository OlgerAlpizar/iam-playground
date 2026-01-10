import { backOff } from 'exponential-backoff';

import { backoffRetry } from './backoff-retry.util';

jest.mock('exponential-backoff');
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  http: jest.fn(),
  debug: jest.fn(),
};

describe('backoffRetry', () => {
  describe('Unit Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return result when operation succeeds', async () => {
      const result = { data: 'success' };
      const operation = jest.fn().mockResolvedValue(result);

      jest.mocked(backOff).mockResolvedValue(result);

      const actualResult = await backoffRetry(operation, {
        title: 'Test Operation',
        maxRetries: 3,
        logger: mockLogger,
      });

      expect(actualResult).toBe(result);
      expect(jest.mocked(backOff)).toHaveBeenCalledWith(operation, expect.any(Object));
    });

    it('should call backOff with correct configuration', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      jest.mocked(backOff).mockResolvedValue('success');

      await backoffRetry(operation, {
        title: 'Test Operation',
        maxRetries: 5,
        initialDelay: 2000,
        maxDelay: 30000,
        logger: mockLogger,
      });

      const callArgs = jest.mocked(backOff).mock.calls[0];
      expect(callArgs[0]).toBe(operation);
      const config = callArgs?.[1];
      expect(config?.numOfAttempts).toBe(5);
      expect(config?.startingDelay).toBe(2000);
      expect(config?.maxDelay).toBe(30000);
    });

    it('should use default values for optional parameters', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      jest.mocked(backOff).mockResolvedValue('success');

      await backoffRetry(operation, {
        title: 'Test Operation',
        maxRetries: 3,
        logger: mockLogger,
      });

      const callArgs = jest.mocked(backOff).mock.calls[0];
      const config = callArgs?.[1];
      expect(config?.numOfAttempts).toBe(3);
      expect(config?.startingDelay).toBe(1000);
      expect(config?.maxDelay).toBe(60000);
    });

    it('should handle zero maxDelay', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      jest.mocked(backOff).mockResolvedValue('success');

      await backoffRetry(operation, {
        title: 'Test Operation',
        maxRetries: 3,
        maxDelay: 0,
        logger: mockLogger,
      });

      const callArgs = jest.mocked(backOff).mock.calls[0];
      const config = callArgs?.[1];
      expect(config?.maxDelay).toBeUndefined();
    });

    it('should log warning and propagate error when operation fails', async () => {
      const mockLogger = {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
      };
      const operation = jest.fn().mockResolvedValue('success');
      const error = new Error('Final failure');
      jest.mocked(backOff).mockRejectedValue(error);

      await expect(
        backoffRetry(operation, {
          title: 'Test Operation',
          maxRetries: 3,
          logger: mockLogger,
        }),
      ).rejects.toThrow('Final failure');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Test Operation failed after 3 attempts: Error: Final failure',
      );
    });

    it('should call retry function when operation fails', async () => {
      const mockLogger = {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
      };
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValue('success');

      jest.mocked(backOff).mockResolvedValue('success');

      const result = await backoffRetry(operation, {
        title: 'Test Operation',
        maxRetries: 3,
        logger: mockLogger,
      });

      expect(result).toBe('success');
      expect(jest.mocked(backOff)).toHaveBeenCalled();

      const backoffCall = jest.mocked(backOff).mock.calls[0];
      const config = backoffCall?.[1];

      const retryFn = config?.retry;
      expect(retryFn).toBeDefined();
      void retryFn?.(new Error('Test error'), 2);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Test Operation attempt 2/3 failed: Error: Test error. Retrying...',
      );
    });
  });
});
