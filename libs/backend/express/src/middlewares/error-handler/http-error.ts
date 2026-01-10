/**
 * Custom HTTP Error class for expressing HTTP-specific errors.
 * Extends the native Error class with HTTP status code and details.
 */
export class HttpError extends Error {
  code: number;
  details: string;
  constructor(message: string, details: string, code: number) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'HttpError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
  }
}
