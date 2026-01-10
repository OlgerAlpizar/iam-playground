import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions } from 'mongoose';

import { createMongooseConnection } from './mongoose';

describe('Database Mongoose Connection', () => {
  describe('Unit Tests', () => {
    const loggerInstance = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      http: jest.fn(),
      debug: jest.fn(),
    };

    const testConfig = {
      connectionString: 'mongodb://localhost:27017/test',
      connectionOptions: {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        maxPoolSize: 5,
        minPoolSize: 2,
        family: 4,
        retryWrites: true,
        retryReads: true,
        bufferCommands: false,
      } as ConnectOptions,
    };

    let mockedMongoose: typeof mongoose;
    let mockedBackoffRetry: jest.Mock;
    let mockedCreateConnection: typeof createMongooseConnection;

    const setConnectionReadyState = (readyState: number) => {
      Object.defineProperty(mockedMongoose.connection, 'readyState', {
        value: readyState,
        writable: true,
        configurable: true,
      });
    };

    beforeAll(() => {
      jest.doMock('@authentication/backend-utils', () => ({
        backoffRetry: jest.fn(),
      }));

      jest.doMock(
        'mongoose',
        () => ({
          connect: jest.fn(),
          set: jest.fn(),
          connection: {
            readyState: 0,
            on: jest.fn(),
            close: jest.fn(),
            host: 'localhost',
            port: 27017,
            name: 'test',
          },
        }),
        { virtual: true },
      );

      jest.resetModules();

      mockedMongoose = require('mongoose') as typeof mongoose;
      const backoffUtils = require('@authentication/backend-utils') as {
        backoffRetry: jest.Mock;
      };
      mockedBackoffRetry = backoffUtils.backoffRetry;
      mockedCreateConnection = (
        require('./mongoose') as { createMongooseConnection: typeof createMongooseConnection }
      ).createMongooseConnection;
    });

    afterAll(() => {
      jest.unmock('mongoose');
      jest.unmock('@authentication/backend-utils');
      jest.resetModules();
    });

    beforeEach(() => {
      jest.clearAllMocks();
      setConnectionReadyState(0);

      Object.defineProperty(mockedMongoose.connection, 'host', {
        value: 'localhost',
        writable: true,
        configurable: true,
      });
      Object.defineProperty(mockedMongoose.connection, 'port', {
        value: 27017,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(mockedMongoose.connection, 'name', {
        value: 'test',
        writable: true,
        configurable: true,
      });
    });

    describe('createMongooseConnection', () => {
      it('should create a connection object with all required methods', () => {
        const connection = mockedCreateConnection(testConfig, loggerInstance);

        expect(connection).toHaveProperty('connect');
        expect(connection).toHaveProperty('disconnect');
        expect(connection).toHaveProperty('healthCheck');
        expect(connection).toHaveProperty('isConnected');
      });
    });

    describe('connect', () => {
      it('should establish connection with default configuration', async () => {
        mockedBackoffRetry.mockImplementation(async (fn: () => Promise<void>) => {
          await fn();
        });

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        await connection.connect();

        expect(mockedMongoose.set).toHaveBeenCalledWith('strictQuery', true);
        expect(mockedMongoose.connection.on).toHaveBeenCalledWith(
          'connected',
          expect.any(Function),
        );
        expect(mockedBackoffRetry).toHaveBeenCalledWith(expect.any(Function), {
          title: 'MongoDB connection',
          logger: loggerInstance,
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 30000,
        });
        expect(mockedMongoose.connect).toHaveBeenCalledWith(
          testConfig.connectionString,
          testConfig.connectionOptions,
        );
        expect(loggerInstance.info).toHaveBeenCalledWith('Mongoose connected successfully');
      });

      it('should prevent multiple connections when already connected', async () => {
        setConnectionReadyState(1);
        mockedBackoffRetry.mockResolvedValue(undefined);

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        await connection.connect();

        expect(mockedBackoffRetry).not.toHaveBeenCalled();
        expect(loggerInstance.info).toHaveBeenCalledWith('Mongoose already connected');
      });

      it('should handle connection errors', async () => {
        const error = new Error('Connection failed');
        mockedBackoffRetry.mockRejectedValue(error);

        const connection = mockedCreateConnection(testConfig, loggerInstance);

        await expect(connection.connect()).rejects.toThrow('Connection failed');
        expect(loggerInstance.error).toHaveBeenCalledWith(
          'Error connecting to mongoose after retries: Connection failed',
        );
      });

      it('should handle non-Error connection errors', async () => {
        mockedBackoffRetry.mockRejectedValue('string error');

        const connection = mockedCreateConnection(testConfig, loggerInstance);

        await expect(connection.connect()).rejects.toThrow('string error');
        expect(loggerInstance.error).toHaveBeenCalledWith(
          'Error connecting to mongoose after retries: string error',
        );
      });

      it('should use custom retry configuration', async () => {
        const customConfig = {
          ...testConfig,
          maxRetries: 5,
          initialRetryDelay: 2000,
          maxRetryDelay: 60000,
        };

        mockedBackoffRetry.mockResolvedValue(undefined);

        const connection = mockedCreateConnection(customConfig, loggerInstance);
        await connection.connect();

        expect(mockedBackoffRetry).toHaveBeenCalledWith(expect.any(Function), {
          title: 'MongoDB connection',
          logger: loggerInstance,
          maxRetries: 5,
          initialDelay: 2000,
          maxDelay: 60000,
        });
      });
    });

    describe('disconnect', () => {
      it('should close connection when connected', async () => {
        setConnectionReadyState(1);
        jest.mocked(mockedMongoose.connection.close).mockResolvedValue(undefined);

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        await connection.disconnect();

        expect(mockedMongoose.connection.close).toHaveBeenCalled();
        expect(loggerInstance.info).toHaveBeenCalledWith('Mongoose disconnected successfully');
      });

      it('should skip disconnection when already disconnected', async () => {
        setConnectionReadyState(0);

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        await connection.disconnect();

        expect(mockedMongoose.connection.close).not.toHaveBeenCalled();
        expect(loggerInstance.info).toHaveBeenCalledWith('Mongoose already disconnected');
      });

      it('should handle disconnection errors', async () => {
        setConnectionReadyState(1);
        const error = new Error('Disconnection failed');
        jest.mocked(mockedMongoose.connection.close).mockRejectedValue(error);

        const connection = mockedCreateConnection(testConfig, loggerInstance);

        await expect(connection.disconnect()).rejects.toThrow('Disconnection failed');
        expect(loggerInstance.error).toHaveBeenCalledWith(
          'Error disconnecting mongoose: Disconnection failed',
        );
      });

      it('should handle non-Error disconnection errors', async () => {
        setConnectionReadyState(1);
        jest.mocked(mockedMongoose.connection.close).mockRejectedValue('string error');

        const connection = mockedCreateConnection(testConfig, loggerInstance);

        await expect(connection.disconnect()).rejects.toThrow('string error');
        expect(loggerInstance.error).toHaveBeenCalledWith(
          'Error disconnecting mongoose: string error',
        );
      });
    });

    describe('healthCheck', () => {
      it('should return healthy status when connected', () => {
        setConnectionReadyState(1);

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        const result = connection.healthCheck();

        expect(result.status).toBe('healthy');
        expect(result.details.state).toBe('connected');
      });

      it('should return unhealthy status when not connected', () => {
        setConnectionReadyState(0);

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        const result = connection.healthCheck();

        expect(result.status).toBe('unhealthy');
        expect(result.details.state).toBe('disconnected');
      });

      it('should handle connection errors', () => {
        setConnectionReadyState(1);

        Object.defineProperty(mockedMongoose.connection, 'host', {
          get: () => {
            throw new Error('Connection error');
          },
          configurable: true,
        });

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        const result = connection.healthCheck();

        expect(result.status).toBe('error');
        expect(result.details.error).toBe('Connection error');
      });

      it('should handle non-Error thrown in healthCheck', () => {
        setConnectionReadyState(1);

        Object.defineProperty(mockedMongoose.connection, 'host', {
          get: () => {
            throw 'string error';
          },
          configurable: true,
        });

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        const result = connection.healthCheck();

        expect(result.status).toBe('error');
        expect(result.details.error).toBe('string error');
      });

      it('should return unhealthy status when connecting', () => {
        setConnectionReadyState(2);

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        const result = connection.healthCheck();

        expect(result.status).toBe('unhealthy');
        expect(result.details.state).toBe('connecting');
      });

      it('should return unhealthy status when disconnecting', () => {
        setConnectionReadyState(3);

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        const result = connection.healthCheck();

        expect(result.status).toBe('unhealthy');
        expect(result.details.state).toBe('disconnecting');
      });

      it('should return unhealthy status for unknown connection state', () => {
        setConnectionReadyState(99);

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        const result = connection.healthCheck();

        expect(result.status).toBe('unhealthy');
        expect(result.details.state).toBe('unknown');
      });
    });

    describe('isConnected', () => {
      it('should return true when connected', () => {
        setConnectionReadyState(1);

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        expect(connection.isConnected()).toBe(true);
      });

      it('should return false when not connected', () => {
        setConnectionReadyState(0);

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        expect(connection.isConnected()).toBe(false);
      });
    });

    describe('event listeners', () => {
      it('should handle connection events setup', async () => {
        mockedBackoffRetry.mockResolvedValue(undefined);

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        await connection.connect();

        expect(mockedMongoose.connection.on).toHaveBeenCalledWith(
          'connected',
          expect.any(Function),
        );
        expect(mockedMongoose.connection.on).toHaveBeenCalledWith('error', expect.any(Function));
        expect(mockedMongoose.connection.on).toHaveBeenCalledWith(
          'disconnected',
          expect.any(Function),
        );
        expect(mockedMongoose.connection.on).toHaveBeenCalledWith(
          'reconnected',
          expect.any(Function),
        );
      });

      it('should log connected event when emitted', async () => {
        mockedBackoffRetry.mockResolvedValue(undefined);

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        await connection.connect();

        const onCalls = jest.mocked(mockedMongoose.connection.on).mock.calls;
        const connectedHandler = onCalls.find(([event]) => event === 'connected')?.[1];

        if (connectedHandler) {
          connectedHandler();
          expect(loggerInstance.info).toHaveBeenCalledWith('Mongoose connected event');
        }
      });

      it('should log error event when emitted', async () => {
        mockedBackoffRetry.mockResolvedValue(undefined);

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        await connection.connect();

        const onCalls = jest.mocked(mockedMongoose.connection.on).mock.calls;
        const errorHandler = onCalls.find(([event]) => event === 'error')?.[1];

        if (errorHandler) {
          const testError = new Error('Connection failed');
          errorHandler(testError);
          expect(loggerInstance.error).toHaveBeenCalledWith(
            'Mongoose error event: Connection failed',
          );
        }
      });

      it('should log error event with non-Error object', async () => {
        mockedBackoffRetry.mockResolvedValue(undefined);

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        await connection.connect();

        const onCalls = jest.mocked(mockedMongoose.connection.on).mock.calls;
        const errorHandler = onCalls.find(([event]) => event === 'error')?.[1];

        if (errorHandler) {
          errorHandler('string error');
          expect(loggerInstance.error).toHaveBeenCalledWith('Mongoose error event: string error');
        }
      });

      it('should log disconnected event when emitted', async () => {
        mockedBackoffRetry.mockResolvedValue(undefined);

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        await connection.connect();

        const onCalls = jest.mocked(mockedMongoose.connection.on).mock.calls;
        const disconnectedHandler = onCalls.find(([event]) => event === 'disconnected')?.[1];

        if (disconnectedHandler) {
          disconnectedHandler();
          expect(loggerInstance.warn).toHaveBeenCalledWith('Mongoose disconnected event');
        }
      });

      it('should log reconnected event when emitted', async () => {
        mockedBackoffRetry.mockResolvedValue(undefined);

        const connection = mockedCreateConnection(testConfig, loggerInstance);
        await connection.connect();

        const onCalls = jest.mocked(mockedMongoose.connection.on).mock.calls;
        const reconnectedHandler = onCalls.find(([event]) => event === 'reconnected')?.[1];

        if (reconnectedHandler) {
          reconnectedHandler();
          expect(loggerInstance.info).toHaveBeenCalledWith('Mongoose reconnected event');
        }
      });
    });
  });

  describe('Integration Tests', () => {
    let mongoServer: MongoMemoryServer;

    const integrationLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      http: jest.fn(),
      debug: jest.fn(),
    };

    beforeAll(async () => {
      mongoServer = await MongoMemoryServer.create();
    });

    afterAll(async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
      await mongoServer.stop();
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    });

    it('should connect to MongoDB memory server', async () => {
      const connection = createMongooseConnection(
        {
          connectionString: mongoServer.getUri(),
          connectionOptions: {},
          maxRetries: 1,
          initialRetryDelay: 100,
          maxRetryDelay: 500,
        },
        integrationLogger,
      );

      await connection.connect();

      expect(connection.isConnected()).toBe(true);
      expect(integrationLogger.info).toHaveBeenCalledWith('Mongoose connected successfully');
    });

    it('should disconnect from MongoDB', async () => {
      const connection = createMongooseConnection(
        {
          connectionString: mongoServer.getUri(),
          connectionOptions: {},
          maxRetries: 1,
        },
        integrationLogger,
      );

      await connection.connect();
      expect(connection.isConnected()).toBe(true);

      await connection.disconnect();
      expect(connection.isConnected()).toBe(false);
      expect(integrationLogger.info).toHaveBeenCalledWith('Mongoose disconnected successfully');
    });

    it('should return healthy status when connected', async () => {
      const connection = createMongooseConnection(
        {
          connectionString: mongoServer.getUri(),
          connectionOptions: {},
          maxRetries: 1,
        },
        integrationLogger,
      );

      await connection.connect();
      const health = connection.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.state).toBe('connected');
      expect(health.details.readyState).toBe(1);
    });

    it('should return unhealthy status when disconnected', () => {
      const connection = createMongooseConnection(
        {
          connectionString: mongoServer.getUri(),
          connectionOptions: {},
          maxRetries: 1,
        },
        integrationLogger,
      );

      const health = connection.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.state).toBe('disconnected');
    });

    it('should not reconnect when already connected', async () => {
      const connection = createMongooseConnection(
        {
          connectionString: mongoServer.getUri(),
          connectionOptions: {},
          maxRetries: 1,
        },
        integrationLogger,
      );

      await connection.connect();
      integrationLogger.info.mockClear();

      await connection.connect();

      expect(integrationLogger.info).toHaveBeenCalledWith('Mongoose already connected');
    });

    it('should not disconnect when already disconnected', async () => {
      const connection = createMongooseConnection(
        {
          connectionString: mongoServer.getUri(),
          connectionOptions: {},
          maxRetries: 1,
        },
        integrationLogger,
      );

      await connection.disconnect();

      expect(integrationLogger.info).toHaveBeenCalledWith('Mongoose already disconnected');
    });
  });
});
