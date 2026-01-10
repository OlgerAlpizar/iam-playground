import type { LoggerInterface } from '@authentication/backend-contracts';
import { backOff, type BackoffOptions } from 'exponential-backoff';

type BackoffRetryOptions = {
  title: string;
  logger: LoggerInterface;
  maxRetries: number;
  initialDelay?: number;
  maxDelay?: number;
};

/**
 * Executes an async operation with exponential backoff retry logic.
 * @template T - The return type of the operation
 * @param fn - The async function to execute and retry on failure
 * @param options.title - Descriptive name for the operation (used in logs)
 * @param options.maxRetries - Maximum number of retry attempts
 * @param options.initialDelay - Initial delay in milliseconds before first retry (default: 1000)
 * @param options.maxDelay - Maximum delay in milliseconds between retries (default: 60000)
 * @param options.logger - Optional logger instance (defaults to winstonLogger)
 * @returns Promise that resolves with the operation result or rejects after all retries are exhausted
 */
export async function backoffRetry<T>(
  fn: () => Promise<T>,
  options: BackoffRetryOptions,
): Promise<T> {
  options.initialDelay ??= 1000;
  options.maxDelay ??= 60000;

  const backoffOptions: Partial<BackoffOptions> = {
    numOfAttempts: options.maxRetries,
    startingDelay: options.initialDelay,
    timeMultiple: 2,
    retry: (retryError: unknown, attemptNumber: number) => {
      options.logger.warn(
        `${options.title} attempt ${attemptNumber}/${options.maxRetries} failed: ${String(
          retryError,
        )}. Retrying...`,
      );
      return true;
    },
  };

  if (options.maxDelay) {
    backoffOptions.maxDelay = options.maxDelay;
  }

  try {
    return await backOff(fn, backoffOptions);
  } catch (finalError: unknown) {
    options.logger.error(
      `${options.title} failed after ${options.maxRetries} attempts: ${String(finalError)}`,
    );
    throw finalError;
  }
}
