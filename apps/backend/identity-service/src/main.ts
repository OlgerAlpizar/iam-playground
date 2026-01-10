import { winstonLogger } from '@authentication/backend-utils';
import { Server } from 'http';

import { app } from './app';
import { appConfig, mongooseConfig } from './config';

const GRACEFUL_SHUTDOWN_TIMEOUT = 10000;

let server: Server;

const gracefulShutdown = async (signal: string): Promise<void> => {
  winstonLogger.warn(`${signal} received. Starting graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    winstonLogger.error('Graceful shutdown timeout exceeded, forcing exit...');
    process.exit(1);
  }, GRACEFUL_SHUTDOWN_TIMEOUT);

  server.close(() => {
    winstonLogger.info('HTTP server closed');
  });

  server.closeAllConnections?.();

  try {
    await mongooseConfig.disconnect();
    clearTimeout(shutdownTimeout);
    winstonLogger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    clearTimeout(shutdownTimeout);
    const err = error instanceof Error ? error : new Error(String(error));
    winstonLogger.error(`Error during graceful shutdown: ${err.message}`);
    process.exit(1);
  }
};

const startServer = async (): Promise<void> => {
  await mongooseConfig.connect();

  server = app.listen(appConfig.port, () => {
    winstonLogger.info(`Server running on port ${appConfig.port} [${appConfig.environment}]`);
  });
};

process.on('uncaughtException', (error: Error) => {
  winstonLogger.error(`Uncaught Exception: ${error.message}`);
  winstonLogger.error(error.stack ?? '');
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  winstonLogger.error(`Unhandled Rejection: ${error.message}`);
  winstonLogger.error(error.stack ?? '');
  process.exit(1);
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer().catch((error) => {
  winstonLogger.error('Failed to start server');
  const err = error instanceof Error ? error : new Error(String(error));
  winstonLogger.error(err.message);
  process.exit(1);
});

export { server };
