import type { LoggerInterface } from '@authentication/backend-contracts';
import type { NextFunction, Request, Response } from 'express';

jest.mock('@authentication/backend-utils', () => ({
  environment: {
    isProduction: jest.fn(() => false),
  },
}));

import { environment } from '@authentication/backend-utils';

import { errorHandler } from './error-handler.middleware';
import { HttpError } from './http-error';

const mockEnvironment = jest.mocked(environment);

const mockLogger: jest.Mocked<LoggerInterface> = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  http: jest.fn(),
  debug: jest.fn(),
};

describe('Error Handler Middleware', () => {
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = { status: statusMock, json: jsonMock };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('Unit Tests', () => {
    describe('HttpError handling', () => {
      it('responds with correct status and logs HttpError details', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger });
        const error = new HttpError('Not found', 'Resource does not exist', 404);

        handler(error, {} as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Not found',
            details: 'Resource does not exist',
            statusCode: 404,
          }),
        );
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Not found - Resource does not exist. code: 404',
        );
      });

      it('handles HttpError without details', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger });

        handler(
          new HttpError('Bad request', '', 400),
          {} as Request,
          mockResponse as Response,
          mockNext,
        );

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Bad request', statusCode: 400 }),
        );
      });
    });

    describe('generic Error handling', () => {
      it('responds 500 for generic errors', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger });

        handler(new Error('Internal error'), {} as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Internal error', statusCode: 500 }),
        );
      });

      it('uses default message for empty error', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger });

        handler(new Error(''), {} as Request, mockResponse as Response, mockNext);

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Something went wrong' }),
        );
      });
    });

    describe('special error types', () => {
      it('handles JSON syntax error as 400', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger });
        const error = new SyntaxError('Unexpected token');
        (error as SyntaxError & { body?: unknown }).body = true;

        handler(error, {} as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Invalid JSON payload',
            details: 'The request body contains malformed JSON',
          }),
        );
      });

      it('does not handle SyntaxError without body property', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger });
        const error = new SyntaxError('Some other syntax error');

        handler(error, {} as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Some other syntax error',
            statusCode: 500,
          }),
        );
      });

      it('handles payload too large as 413', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger });
        const error = new Error('Payload too large');
        (error as Error & { type?: string; limit?: string }).type = 'entity.too.large';
        (error as Error & { type?: string; limit?: string }).limit = '10mb';

        handler(error, {} as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(413);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Payload too large',
            details: 'Request body exceeds the maximum allowed size of 10mb',
          }),
        );
      });

      it('handles payload too large with unknown limit when limit is undefined', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger });
        const error = new Error('Payload too large');
        (error as Error & { type?: string }).type = 'entity.too.large';

        handler(error, {} as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(413);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Payload too large',
            details: 'Request body exceeds the maximum allowed size of unknown',
          }),
        );
        expect(mockLogger.error).toHaveBeenCalledWith('Payload too large: exceeds unknown');
      });
    });

    describe('domain error handling', () => {
      const domainErrorMap = {
        USER_NOT_FOUND: { statusCode: 404, message: 'User not found' },
        DUPLICATE_EMAIL: { statusCode: 409, message: 'Email already registered' },
      };

      it('handles domain error when code matches mapping', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger, domainErrorMap });
        const error = new Error('User with id 123 not found') as Error & { code: string };
        error.code = 'USER_NOT_FOUND';

        handler(error, {} as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'User not found',
            details: 'User with id 123 not found',
            statusCode: 404,
            code: 'USER_NOT_FOUND',
          }),
        );
        expect(mockLogger.error).toHaveBeenCalledWith('User not found: User with id 123 not found');
      });

      it('handles different domain error codes correctly', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger, domainErrorMap });
        const error = new Error('test@example.com') as Error & { code: string };
        error.code = 'DUPLICATE_EMAIL';

        handler(error, {} as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(409);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Email already registered',
            code: 'DUPLICATE_EMAIL',
          }),
        );
      });

      it('falls through when domainErrorMap is not provided', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger });
        const error = new Error('Some error') as Error & { code: string };
        error.code = 'USER_NOT_FOUND';

        handler(error, {} as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(500);
      });

      it('falls through when error has no code', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger, domainErrorMap });
        const error = new Error('Error without code');

        handler(error, {} as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(500);
      });

      it('falls through when error code is not in mapping', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger, domainErrorMap });
        const error = new Error('Unknown error') as Error & { code: string };
        error.code = 'UNKNOWN_ERROR_CODE';

        handler(error, {} as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(500);
      });

      it('excludes stack trace for domain error in production', () => {
        mockEnvironment.isProduction.mockReturnValueOnce(true);
        const handler = errorHandler.createMiddleware({ logger: mockLogger, domainErrorMap });
        const error = new Error('User not found') as Error & { code: string };
        error.code = 'USER_NOT_FOUND';

        handler(error, {} as Request, mockResponse as Response, mockNext);

        const calls = jsonMock.mock.calls as Array<[{ stack?: string }]>;
        const response = calls[0][0];
        expect(response.stack).toBeUndefined();
      });

      it('includes stack trace for domain error in development', () => {
        mockEnvironment.isProduction.mockReturnValueOnce(false);
        const handler = errorHandler.createMiddleware({ logger: mockLogger, domainErrorMap });
        const error = new Error('User not found') as Error & { code: string };
        error.code = 'USER_NOT_FOUND';

        handler(error, {} as Request, mockResponse as Response, mockNext);

        const calls = jsonMock.mock.calls as Array<[{ stack?: string }]>;
        const response = calls[0][0];
        expect(response.stack).toBeDefined();
      });
    });

    describe('MongoDB error handling', () => {
      it('handles MongoDB duplicate key error (code 11000)', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger });
        const error = new Error('Duplicate key') as Error & {
          code: number;
          keyPattern: Record<string, unknown>;
          keyValue: Record<string, unknown>;
        };
        error.code = 11000;
        error.keyPattern = { email: 1 };
        error.keyValue = { email: 'test@example.com' };

        handler(error, {} as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(409);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Duplicate entry',
            details: 'A record with this email already exists',
            statusCode: 409,
            code: 'DUPLICATE_KEY',
          }),
        );
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Duplicate key error: email=test@example.com',
        );
      });

      it('handles MongoDB duplicate key error without keyPattern', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger });
        const error = new Error('Duplicate key') as Error & {
          code: number;
          keyValue: Record<string, unknown>;
        };
        error.code = 11000;
        error.keyValue = { email: 'test@example.com' };

        handler(error, {} as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(409);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            details: 'A record with this field already exists',
          }),
        );
      });

      it('handles MongoDB duplicate key error without keyValue', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger });
        const error = new Error('Duplicate key') as Error & {
          code: number;
          keyPattern: Record<string, unknown>;
        };
        error.code = 11000;
        error.keyPattern = { username: 1 };

        handler(error, {} as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(409);
        expect(mockLogger.error).toHaveBeenCalledWith('Duplicate key error: username=unknown');
      });

      it('does not handle non-11000 MongoDB errors', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger });
        const error = new Error('Some other mongo error') as Error & { code: number };
        error.code = 12345;

        handler(error, {} as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(500);
      });

      it('excludes stack trace for MongoDB error in production', () => {
        mockEnvironment.isProduction.mockReturnValueOnce(true);
        const handler = errorHandler.createMiddleware({ logger: mockLogger });
        const error = new Error('Duplicate key') as Error & { code: number };
        error.code = 11000;

        handler(error, {} as Request, mockResponse as Response, mockNext);

        const calls = jsonMock.mock.calls as Array<[{ stack?: string }]>;
        const response = calls[0][0];
        expect(response.stack).toBeUndefined();
      });

      it('includes stack trace for MongoDB error in development', () => {
        mockEnvironment.isProduction.mockReturnValueOnce(false);
        const handler = errorHandler.createMiddleware({ logger: mockLogger });
        const error = new Error('Duplicate key') as Error & { code: number };
        error.code = 11000;

        handler(error, {} as Request, mockResponse as Response, mockNext);

        const calls = jsonMock.mock.calls as Array<[{ stack?: string }]>;
        const response = calls[0][0];
        expect(response.stack).toBeDefined();
      });
    });

    describe('timeout handling', () => {
      it('responds 408 when req.timedout is true', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger });

        handler(new Error('x'), { timedout: true } as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(408);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Request timeout',
            details: 'The request took too long to process and was timed out',
          }),
        );
      });

      it('does not handle timeout when timedout is false or undefined', () => {
        const handler = errorHandler.createMiddleware({ logger: mockLogger });

        handler(
          new HttpError('Test', '', 400),
          { timedout: false } as Request,
          mockResponse as Response,
          mockNext,
        );
        expect(statusMock).toHaveBeenCalledWith(400);

        statusMock.mockClear();
        handler(new Error('Test'), {} as Request, mockResponse as Response, mockNext);
        expect(statusMock).toHaveBeenCalledWith(500);
      });
    });

    describe('production mode', () => {
      const getResponseFromMock = (): { stack?: string } => {
        const calls = jsonMock.mock.calls as Array<[{ stack?: string }]>;
        return calls[0][0];
      };

      it('excludes stack trace in production', () => {
        mockEnvironment.isProduction.mockReturnValueOnce(true);
        const handler = errorHandler.createMiddleware({ logger: mockLogger });

        handler(new Error('Test'), {} as Request, mockResponse as Response, mockNext);

        expect(getResponseFromMock().stack).toBeUndefined();
      });

      it('includes stack trace in development', () => {
        mockEnvironment.isProduction.mockReturnValueOnce(false);
        const handler = errorHandler.createMiddleware({ logger: mockLogger });

        handler(new Error('Test'), {} as Request, mockResponse as Response, mockNext);

        expect(getResponseFromMock().stack).toBeDefined();
      });

      it('excludes stack trace for JSON syntax error in production', () => {
        mockEnvironment.isProduction.mockReturnValueOnce(true);
        const handler = errorHandler.createMiddleware({ logger: mockLogger });
        const error = new SyntaxError('Unexpected token');
        (error as SyntaxError & { body?: unknown }).body = true;

        handler(error, {} as Request, mockResponse as Response, mockNext);

        expect(getResponseFromMock().stack).toBeUndefined();
      });

      it('excludes stack trace for payload too large in production', () => {
        mockEnvironment.isProduction.mockReturnValueOnce(true);
        const handler = errorHandler.createMiddleware({ logger: mockLogger });
        const error = new Error('Payload too large');
        (error as Error & { type?: string; limit?: string }).type = 'entity.too.large';
        (error as Error & { type?: string; limit?: string }).limit = '10mb';

        handler(error, {} as Request, mockResponse as Response, mockNext);

        expect(getResponseFromMock().stack).toBeUndefined();
      });

      it('excludes stack trace for timeout error in production', () => {
        mockEnvironment.isProduction.mockReturnValueOnce(true);
        const handler = errorHandler.createMiddleware({ logger: mockLogger });

        handler(new Error('x'), { timedout: true } as Request, mockResponse as Response, mockNext);

        expect(getResponseFromMock().stack).toBeUndefined();
      });
    });
  });
});
