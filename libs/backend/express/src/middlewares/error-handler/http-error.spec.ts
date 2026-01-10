import { HttpError } from './http-error';

describe('HttpError', () => {
  describe('constructor', () => {
    it('should create an error with message, details, and code', () => {
      const error = new HttpError('Not Found', 'Resource does not exist', 404);

      expect(error.message).toBe('Not Found');
      expect(error.details).toBe('Resource does not exist');
      expect(error.code).toBe(404);
    });

    it('should set the error name to HttpError', () => {
      const error = new HttpError('Bad Request', 'Invalid input', 400);

      expect(error.name).toBe('HttpError');
    });

    it('should be an instance of Error', () => {
      const error = new HttpError('Server Error', 'Internal error', 500);

      expect(error).toBeInstanceOf(Error);
    });

    it('should be an instance of HttpError', () => {
      const error = new HttpError('Forbidden', 'Access denied', 403);

      expect(error).toBeInstanceOf(HttpError);
    });

    it('should have a stack trace', () => {
      const error = new HttpError('Unauthorized', 'Invalid token', 401);

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });

  describe('error properties', () => {
    it('should handle 400-level errors', () => {
      const error400 = new HttpError('Bad Request', 'Invalid data', 400);
      const error404 = new HttpError('Not Found', 'Resource missing', 404);
      const error403 = new HttpError('Forbidden', 'No access', 403);

      expect(error400.code).toBe(400);
      expect(error404.code).toBe(404);
      expect(error403.code).toBe(403);
    });

    it('should handle 500-level errors', () => {
      const error500 = new HttpError('Internal Error', 'Server failure', 500);
      const error503 = new HttpError('Service Unavailable', 'Service down', 503);

      expect(error500.code).toBe(500);
      expect(error503.code).toBe(503);
    });

    it('should preserve error message in string conversion', () => {
      const error = new HttpError('Validation Error', 'Invalid email format', 422);

      expect(error.toString()).toContain('HttpError');
      expect(error.toString()).toContain('Validation Error');
    });

    it('should handle empty details', () => {
      const error = new HttpError('Error', '', 500);

      expect(error.details).toBe('');
      expect(error.message).toBe('Error');
    });

    it('should handle long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new HttpError(longMessage, 'Details', 500);

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(1000);
    });
  });

  describe('instanceof checks', () => {
    it('should pass instanceof check for Error', () => {
      const error = new HttpError('Test', 'Details', 500);

      expect(error instanceof Error).toBe(true);
    });

    it('should pass instanceof check for HttpError', () => {
      const error = new HttpError('Test', 'Details', 500);

      expect(error instanceof HttpError).toBe(true);
    });

    it('should allow differentiation from regular Error', () => {
      const httpError = new HttpError('HTTP Error', 'Details', 500);
      const regularError = new Error('Regular Error');

      expect(httpError instanceof HttpError).toBe(true);
      expect(regularError instanceof HttpError).toBe(false);
    });
  });

  describe('error handling scenarios', () => {
    it('should be catchable in try-catch', () => {
      expect(() => {
        throw new HttpError('Test Error', 'Test Details', 500);
      }).toThrow(HttpError);
    });

    it('should preserve error information when caught', () => {
      try {
        throw new HttpError('Database Error', 'Connection failed', 503);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        if (error instanceof HttpError) {
          expect(error.message).toBe('Database Error');
          expect(error.details).toBe('Connection failed');
          expect(error.code).toBe(503);
        }
      }
    });

    it('should be distinguishable from other errors in catch', () => {
      const errors = [
        new HttpError('HTTP Error', 'Details', 404),
        new Error('Regular Error'),
        new TypeError('Type Error'),
      ];

      const httpErrors = errors.filter((e) => e instanceof HttpError);

      expect(httpErrors).toHaveLength(1);
      expect(httpErrors[0]).toBeInstanceOf(HttpError);
    });
  });

  describe('common HTTP status codes', () => {
    it('should create 400 Bad Request error', () => {
      const error = new HttpError('Bad Request', 'Invalid request body', 400);

      expect(error.code).toBe(400);
      expect(error.message).toBe('Bad Request');
    });

    it('should create 401 Unauthorized error', () => {
      const error = new HttpError('Unauthorized', 'Authentication required', 401);

      expect(error.code).toBe(401);
    });

    it('should create 403 Forbidden error', () => {
      const error = new HttpError('Forbidden', 'Insufficient permissions', 403);

      expect(error.code).toBe(403);
    });

    it('should create 404 Not Found error', () => {
      const error = new HttpError('Not Found', 'Resource not found', 404);

      expect(error.code).toBe(404);
    });

    it('should create 422 Unprocessable Entity error', () => {
      const error = new HttpError('Validation Error', 'Invalid data format', 422);

      expect(error.code).toBe(422);
    });

    it('should create 500 Internal Server Error', () => {
      const error = new HttpError('Internal Server Error', 'Unexpected error', 500);

      expect(error.code).toBe(500);
    });

    it('should create 503 Service Unavailable error', () => {
      const error = new HttpError('Service Unavailable', 'Service temporarily down', 503);

      expect(error.code).toBe(503);
    });
  });
});
