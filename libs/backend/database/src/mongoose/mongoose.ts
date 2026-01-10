import type { LoggerInterface } from '@authentication/backend-contracts';
import { backoffRetry } from '@authentication/backend-utils';
import mongoose, { ConnectOptions } from 'mongoose';

type MongooseConfig = {
  connectionString: string;
  connectionOptions: ConnectOptions;
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
};

type HealthCheckResult = {
  status: string;
  details: {
    state: string;
    readyState: number;
    host: string;
    port: number;
    name: string;
    error?: string;
  };
};

const setupEventListeners = (logger: LoggerInterface): void => {
  mongoose.connection.on('connected', () => {
    logger.info('Mongoose connected event');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`Mongoose error event: ${err instanceof Error ? err.message : String(err)}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('Mongoose disconnected event');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('Mongoose reconnected event');
  });
};

const getConnectionState = (): string => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState as keyof typeof states] || 'unknown';
};

/**
 * Performs a health check on the MongoDB connection.
 * @returns Health check result with status and connection details
 */
const healthCheck = (): HealthCheckResult => {
  try {
    const state = getConnectionState();
    const isHealthy = state === 'connected';

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: {
        state,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
      },
    };
  } catch (err) {
    return {
      status: 'error',
      details: {
        state: 'unknown',
        readyState: 0,
        host: '',
        port: 0,
        name: '',
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
};

/**
 * Checks if MongoDB connection is currently active.
 * @returns if connected
 */
const isConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

/**
 * Establishes connection to MongoDB with retry logic.
 * @param config - MongoDB connection configuration
 * @param logger - Logger instance for logging operations
 */
const connect = async (config: MongooseConfig, logger: LoggerInterface): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    logger.info('Mongoose already connected');
    return;
  }

  mongoose.set('strictQuery', true);

  try {
    setupEventListeners(logger);

    await backoffRetry(() => mongoose.connect(config.connectionString, config.connectionOptions), {
      title: 'MongoDB connection',
      logger,
      maxRetries: config.maxRetries ?? 3,
      initialDelay: config.initialRetryDelay ?? 1000,
      maxDelay: config.maxRetryDelay ?? 30000,
    });

    logger.info('Mongoose connected successfully');
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(`Error connecting to mongoose after retries: ${error.message}`);
    throw error;
  }
};

/**
 * Closes the MongoDB connection gracefully.
 * Prevents multiple disconnect attempts if already disconnected.
 * @param logger - Logger instance for logging operations
 */
const disconnect = async (logger: LoggerInterface): Promise<void> => {
  try {
    if (mongoose.connection.readyState === 0) {
      logger.info('Mongoose already disconnected');
      return;
    }

    await mongoose.connection.close();
    logger.info('Mongoose disconnected successfully');
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(`Error disconnecting mongoose: ${error.message}`);
    throw error;
  }
};

export const createMongooseConnection = (config: MongooseConfig, logger: LoggerInterface) => {
  return {
    connect: () => connect(config, logger),
    disconnect: () => disconnect(logger),
    healthCheck,
    isConnected,
  } as const;
};
