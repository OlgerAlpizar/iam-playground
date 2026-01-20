import { winstonLogger } from '@authentication/backend-utils';
import Redis from 'ioredis';

import { appConfig } from './app.config';

let redisClient: Redis | null = null;

const createRedisClient = (): Redis | null => {
  if (!appConfig.redisUrl) {
    winstonLogger.info('Redis URL not configured, using in-memory store');
    return null;
  }

  try {
    const client = new Redis(appConfig.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          winstonLogger.warn('Redis connection failed, falling back to in-memory store');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    client.on('connect', () => {
      winstonLogger.info('Redis connected');
    });

    client.on('error', (error) => {
      winstonLogger.error('Redis error', { error: error.message });
    });

    return client;
  } catch (error) {
    winstonLogger.warn('Failed to create Redis client', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
};

export const getRedisClient = (): Redis | null => {
  if (redisClient === null && appConfig.redisUrl) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

export const healthCheck = (): boolean => {
  const client = getRedisClient();
  return client !== null && client.status === 'ready';
};
