import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Mongoose Connection Configuration', () => {
  describe('Unit Tests', () => {
    const originalEnv = process.env;

    beforeAll(() => {
      jest.doMock('@authentication/backend-database', () => ({
        createMongooseConnection: jest.fn(() => ({
          connect: jest.fn(),
          disconnect: jest.fn(),
          healthCheck: jest.fn(),
          isConnected: jest.fn(),
        })),
      }));

      jest.doMock('@authentication/backend-utils', () => ({
        winstonLogger: {
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
          http: jest.fn(),
          debug: jest.fn(),
        },
      }));
    });

    afterAll(() => {
      jest.unmock('@authentication/backend-database');
      jest.unmock('@authentication/backend-utils');
    });

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should configure mongoose connection for development environment', () => {
      process.env.NODE_ENV = 'development';
      process.env.WHITE_LIST_URLS = 'https://example.com';
      process.env.MONGO_CONN_STRING = 'mongodb://localhost:27017/devdb';
      process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long';

      const mockCreateMongooseConnection = (
        require('@authentication/backend-database') as {
          createMongooseConnection: jest.Mock;
        }
      ).createMongooseConnection;

      require('./mongoose.config');

      const mockWinstonLogger = (
        require('@authentication/backend-utils') as { winstonLogger: unknown }
      ).winstonLogger;

      expect(mockCreateMongooseConnection).toHaveBeenCalledWith(
        {
          connectionString: 'mongodb://localhost:27017/devdb',
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
          },
        },
        mockWinstonLogger,
      );
    });

    it('should configure mongoose connection for production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.WHITE_LIST_URLS = 'https://example.com';
      process.env.MONGO_CONN_STRING = 'mongodb://prod-server:27017/proddb';
      process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long';

      const mockCreateMongooseConnection = (
        require('@authentication/backend-database') as {
          createMongooseConnection: jest.Mock;
        }
      ).createMongooseConnection;

      require('./mongoose.config');

      const mockWinstonLogger = (
        require('@authentication/backend-utils') as { winstonLogger: unknown }
      ).winstonLogger;

      expect(mockCreateMongooseConnection).toHaveBeenCalledWith(
        {
          connectionString: 'mongodb://prod-server:27017/proddb',
          connectionOptions: {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000,
            maxPoolSize: 10,
            minPoolSize: 5,
            family: 4,
            retryWrites: true,
            retryReads: true,
            bufferCommands: false,
          },
        },
        mockWinstonLogger,
      );
    });
  });

  describe('Integration Tests', () => {
    const originalEnv = process.env;
    let mongoServer: MongoMemoryServer;

    beforeAll(async () => {
      mongoServer = await MongoMemoryServer.create();
    });

    afterAll(async () => {
      await mongoServer.stop();
    });

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(async () => {
      process.env = originalEnv;
      const mongoose = (await import('mongoose')).default;
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    });

    it('should export mongooseConfig with all required methods', async () => {
      process.env.NODE_ENV = 'development';
      process.env.WHITE_LIST_URLS = 'https://example.com';
      process.env.MONGO_CONN_STRING = mongoServer.getUri();
      process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long';

      const { mongooseConfig } = await import('./mongoose.config');

      expect(mongooseConfig).toHaveProperty('connect');
      expect(mongooseConfig).toHaveProperty('disconnect');
      expect(mongooseConfig).toHaveProperty('healthCheck');
      expect(mongooseConfig).toHaveProperty('isConnected');
    });

    it('should connect to MongoDB successfully', async () => {
      process.env.NODE_ENV = 'development';
      process.env.WHITE_LIST_URLS = 'https://example.com';
      process.env.MONGO_CONN_STRING = mongoServer.getUri();
      process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long';

      const { mongooseConfig } = await import('./mongoose.config');

      await mongooseConfig.connect();

      expect(mongooseConfig.isConnected()).toBe(true);
    });

    it('should disconnect from MongoDB successfully', async () => {
      process.env.NODE_ENV = 'development';
      process.env.WHITE_LIST_URLS = 'https://example.com';
      process.env.MONGO_CONN_STRING = mongoServer.getUri();
      process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long';

      const { mongooseConfig } = await import('./mongoose.config');

      await mongooseConfig.connect();
      expect(mongooseConfig.isConnected()).toBe(true);

      await mongooseConfig.disconnect();
      expect(mongooseConfig.isConnected()).toBe(false);
    });

    it('should return healthy status when connected', async () => {
      process.env.NODE_ENV = 'development';
      process.env.WHITE_LIST_URLS = 'https://example.com';
      process.env.MONGO_CONN_STRING = mongoServer.getUri();
      process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long';

      const { mongooseConfig } = await import('./mongoose.config');

      await mongooseConfig.connect();
      const health = mongooseConfig.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.state).toBe('connected');
    });

    it('should return unhealthy status when disconnected', async () => {
      process.env.NODE_ENV = 'development';
      process.env.WHITE_LIST_URLS = 'https://example.com';
      process.env.MONGO_CONN_STRING = mongoServer.getUri();
      process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long';

      const { mongooseConfig } = await import('./mongoose.config');

      const health = mongooseConfig.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.state).toBe('disconnected');
    });
  });
});
