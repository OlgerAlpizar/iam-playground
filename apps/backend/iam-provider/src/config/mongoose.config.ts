import { createMongooseConnection } from '@authentication/backend-database';
import { winstonLogger } from '@authentication/backend-utils';
import { ConnectOptions } from 'mongoose';

import { appConfig } from './app.config';

const getConnectionOptions = (): ConnectOptions => {
  const isProduction = appConfig.environment === 'production';

  return {
    serverSelectionTimeoutMS: isProduction ? 10000 : 5000,
    socketTimeoutMS: isProduction ? 45000 : 30000,
    connectTimeoutMS: 30000,
    maxPoolSize: isProduction ? 10 : 5,
    minPoolSize: isProduction ? 5 : 2,
    family: 4,
    retryWrites: true,
    retryReads: true,
    bufferCommands: false,
  };
};

export const mongooseConfig = createMongooseConnection(
  {
    connectionString: appConfig.mongoConnString,
    connectionOptions: getConnectionOptions(),
  },
  winstonLogger,
);
