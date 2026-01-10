import type { LoggerInterface } from '@authentication/backend-contracts';
import * as winston from 'winston';

import { environment } from '../environment/environment.util';

const loggerInstancesInCache = new Map<string, LoggerInterface>();

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

const getMinLogLevel = (): string => {
  return environment.isDevelopment() ? 'debug' : 'warn';
};

const getLogFormat = () => {
  if (environment.isProduction()) {
    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );
  }

  return winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true, colors }),
    winston.format.printf((info) => {
      const message =
        info.message ?? (typeof info === 'object' ? JSON.stringify(info, null, 2) : String(info));
      const { timestamp: _timestamp, level: _level, message: _message, ...extra } = info;
      const extraStr = Object.keys(extra).length > 0 ? ` ${JSON.stringify(extra)}` : '';
      return `${info.timestamp} ${info.level}: ${message}${extraStr}`;
    }),
  );
};

const getTransports = (): winston.transport[] => {
  return [
    new winston.transports.Console({
      format: getLogFormat(),
    }),
  ];
};

class WinstonLogger implements LoggerInterface {
  constructor(private logger: winston.Logger) {}

  /**
   * Logs an error message with optional metadata.
   * @param message - The error message to log
   * @param meta - Optional metadata object to include with the log
   */
  error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, meta);
  }

  /**
   * Logs a warning message with optional metadata.
   * @param message - The warning message to log
   * @param meta - Optional metadata object to include with the log
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  /**
   * Logs an informational message with optional metadata.
   * @param message - The informational message to log
   * @param meta - Optional metadata object to include with the log
   */
  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  /**
   * Logs an HTTP request/response message with optional metadata.
   * @param message - The HTTP message to log (request/response details)
   * @param meta - Optional metadata object to include with the log
   */
  http(message: string, meta?: Record<string, unknown>): void {
    this.logger.http(message, meta);
  }

  /**
   * Logs a debug message with optional metadata.
   * @param message - The debug message to log
   * @param meta - Optional metadata object to include with the log
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }
}

/**
 * Creates or retrieves a Winston logger instance based on the current environment.
 * @returns A configured Winston logger instance
 */
export const createOrGetWinstonLogger = (): LoggerInterface => {
  const targetEnv = environment.getEnvironmentName();
  const existingLoggerInstance = loggerInstancesInCache.get(targetEnv);

  if (existingLoggerInstance) {
    return existingLoggerInstance;
  }

  const winstonLoggerInstance = winston.createLogger({
    level: getMinLogLevel(),
    levels,
    transports: getTransports(),
  });

  const loggerInstance = new WinstonLogger(winstonLoggerInstance);

  loggerInstancesInCache.set(targetEnv, loggerInstance);

  return loggerInstance;
};

/**
 * Default Winston logger instance that auto-detects the environment and caches the instance for the current environment.
 * @returns A configured Winston logger instance
 */
export const winstonLogger: LoggerInterface = createOrGetWinstonLogger();
