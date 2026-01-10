/**
 * Logger contract interface for dependency injection.
 * Defines the contract that all logger implementations must fulfill.
 * This enables flexible logging strategies across the application.
 */
export interface LoggerInterface {
  error: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  http: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}
