import type { LoggerInterface } from '@authentication/backend-contracts';
import { environment } from '@authentication/backend-utils';
import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';

import { HttpError } from './http-error';

type DomainAsHttpError = { statusCode: number; message: string };

type ErrorHandlerOptions = {
  logger: LoggerInterface;
  domainErrorMap?: Record<string, DomainAsHttpError>;
};

type DomainError = Error & { code?: string };

const handleJsonSyntaxError = (
  error: SyntaxError & { body?: unknown },
  logger: LoggerInterface,
  res: Response,
): boolean => {
  if (!(error instanceof SyntaxError && 'body' in error)) {
    return false;
  }

  logger.error(`Invalid JSON payload: ${error.message}`);

  const isProduction = environment.isProduction();

  res.status(400).json({
    message: 'Invalid JSON payload',
    details: 'The request body contains malformed JSON',
    statusCode: 400,
    ...(!isProduction && { stack: error.stack }),
  });

  return true;
};

const handlePayloadTooLargeError = (
  error: Error & { type?: string; limit?: string },
  logger: LoggerInterface,
  res: Response,
): boolean => {
  if (error.type !== 'entity.too.large') {
    return false;
  }

  const isProduction = environment.isProduction();
  const limit = error.limit ?? 'unknown';
  logger.error(`Payload too large: exceeds ${limit}`);

  res.status(413).json({
    message: 'Payload too large',
    details: `Request body exceeds the maximum allowed size of ${limit}`,
    statusCode: 413,
    ...(!isProduction && { stack: error.stack }),
  });

  return true;
};

const handleTimeoutError = (req: Request, logger: LoggerInterface, res: Response): boolean => {
  if (!req.timedout) {
    return false;
  }

  logger.error('Request timeout: The request took too long to process');

  const isProduction = environment.isProduction();

  res.status(408).json({
    message: 'Request timeout',
    details: 'The request took too long to process and was timed out',
    statusCode: 408,
    ...(!isProduction && { stack: new Error().stack }),
  });

  return true;
};

const handleDomainError = (
  error: DomainError,
  logger: LoggerInterface,
  res: Response,
  domainErrorMap?: Record<string, DomainAsHttpError>,
): boolean => {
  if (!domainErrorMap) {
    return false;
  }

  const errorCode = error.code;
  if (!errorCode || !domainErrorMap[errorCode]) {
    return false;
  }

  const { statusCode, message } = domainErrorMap[errorCode];
  const isProduction = environment.isProduction();

  logger.error(`${message}: ${error.message}`);

  res.status(statusCode).json({
    message,
    details: error.message,
    statusCode,
    code: errorCode,
    ...(!isProduction && { stack: error.stack }),
  });

  return true;
};

const handleMongoError = (
  error: Error & {
    code?: number;
    keyPattern?: Record<string, unknown>;
    keyValue?: Record<string, unknown>;
  },
  logger: LoggerInterface,
  res: Response,
): boolean => {
  if (error.code !== 11000) {
    return false;
  }

  const field = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'field';
  const value = error.keyValue ? Object.values(error.keyValue)[0] : 'unknown';
  const isProduction = environment.isProduction();

  logger.error(`Duplicate key error: ${field}=${value}`);

  res.status(409).json({
    message: 'Duplicate entry',
    details: `A record with this ${field} already exists`,
    statusCode: 409,
    code: 'DUPLICATE_KEY',
    ...(!isProduction && { stack: error.stack }),
  });

  return true;
};

const handleApplicationError = (
  error: HttpError | Error,
  logger: LoggerInterface,
  res: Response,
): void => {
  const isHttpError = error instanceof HttpError;
  const statusCode = isHttpError ? error.code : 500;
  const message = error.message || 'Something went wrong';
  const details = isHttpError ? error.details : '';
  const isProduction = environment.isProduction();

  if (isHttpError) {
    logger.error(`${message} - ${details}. code: ${statusCode}`);
  } else {
    logger.error(`${message}${error.stack && !isProduction ? `\n${error.stack}` : ''}`);
  }

  res.status(statusCode).json({
    message,
    ...(details && { details }),
    statusCode,
    ...(!isProduction && { stack: error.stack }),
  });
};

/**
 * Creates an error handler middleware with dependency injection.
 * Handles several application errors such as timeouts, JSON syntax errors, payload too large errors, and application errors.
 * @param options - Configuration options containing the logger instance
 * @property {LoggerInterface} logger - Logger instance for logging operations
 * @returns Middleware
 */
const createMiddleware = (options: ErrorHandlerOptions): ErrorRequestHandler => {
  return (error: HttpError | Error, req: Request, res: Response, _next: NextFunction): void => {
    if (handleTimeoutError(req, options.logger, res)) {
      return;
    }

    if (handleJsonSyntaxError(error as SyntaxError & { body?: unknown }, options.logger, res)) {
      return;
    }

    if (
      handlePayloadTooLargeError(
        error as Error & { type?: string; limit?: string },
        options.logger,
        res,
      )
    ) {
      return;
    }

    if (handleDomainError(error as DomainError, options.logger, res, options.domainErrorMap)) {
      return;
    }

    if (
      handleMongoError(
        error as Error & {
          code?: number;
          keyPattern?: Record<string, unknown>;
          keyValue?: Record<string, unknown>;
        },
        options.logger,
        res,
      )
    ) {
      return;
    }

    handleApplicationError(error, options.logger, res);
  };
};

export type { DomainAsHttpError };

export const errorHandler = {
  createMiddleware,
} as const;
