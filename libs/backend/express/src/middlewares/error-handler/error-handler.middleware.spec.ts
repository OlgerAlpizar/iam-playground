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
