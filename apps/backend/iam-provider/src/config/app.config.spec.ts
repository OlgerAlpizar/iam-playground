type AppConfig = {
  environment: 'development' | 'production' | 'test';
  port: number;
  whiteListUrls: string[];
  mongoConnString: string;
};

describe('Settings', () => {
  describe('Unit Tests', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = {
        ...originalEnv,
        NODE_ENV: 'test',
        WHITE_LIST_URLS: 'https://example.com',
        MONGO_CONN_STRING: 'mongodb://localhost:27017/test',
        JWT_SECRET: 'test-secret-key-minimum-32-characters-long',
      };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    describe('environment', () => {
      it('should throw when NODE_ENV is not set', () => {
        delete process.env.NODE_ENV;
        expect(() => {
          require('./app.config');
        }).toThrow('NODE_ENV environment variable is required');
      });

      it('should return the NODE_ENV value', () => {
        process.env.NODE_ENV = 'production';
        jest.resetModules();
        const { appConfig } = require('./app.config') as { appConfig: AppConfig };
        expect(appConfig.environment).toBe('production');
      });

      it('should throw on invalid environment value', () => {
        process.env.NODE_ENV = 'invalid';
        expect(() => {
          require('./app.config');
        }).toThrow('NODE_ENV must be one of: development, production, test');
      });
    });

    describe('serverPort', () => {
      it('should return default port 3010 when PORT is not set', () => {
        delete process.env.PORT;
        jest.resetModules();
        const { appConfig } = require('./app.config') as { appConfig: AppConfig };
        expect(appConfig.port).toBe(3010);
      });

      it('should return the PORT value', () => {
        process.env.PORT = '8080';
        jest.resetModules();
        const { appConfig } = require('./app.config') as { appConfig: AppConfig };
        expect(appConfig.port).toBe(8080);
      });
    });

    describe('whiteListUrls', () => {
      it('should throw when WHITE_LIST_URLS is not set', () => {
        delete process.env.WHITE_LIST_URLS;
        expect(() => {
          require('./app.config');
        }).toThrow('WHITE_LIST_URLS environment variable is required');
      });

      it('should return array of URLs when WHITE_LIST_URLS is set', () => {
        process.env.WHITE_LIST_URLS = 'https://example.com,https://test.com';
        jest.resetModules();
        const { appConfig } = require('./app.config') as { appConfig: AppConfig };
        expect(appConfig.whiteListUrls).toEqual(['https://example.com', 'https://test.com']);
      });

      it('should trim whitespace from URLs', () => {
        process.env.WHITE_LIST_URLS = 'https://example.com , https://test.com , https://dev.com';
        jest.resetModules();
        const { appConfig } = require('./app.config') as { appConfig: AppConfig };
        expect(appConfig.whiteListUrls).toEqual([
          'https://example.com',
          'https://test.com',
          'https://dev.com',
        ]);
      });

      it('should handle single URL', () => {
        process.env.WHITE_LIST_URLS = 'https://example.com';
        jest.resetModules();
        const { appConfig } = require('./app.config') as { appConfig: AppConfig };
        expect(appConfig.whiteListUrls).toEqual(['https://example.com']);
      });

      it('should filter out empty URLs', () => {
        process.env.WHITE_LIST_URLS = 'https://example.com,,https://test.com,';
        jest.resetModules();
        const { appConfig } = require('./app.config') as { appConfig: AppConfig };
        expect(appConfig.whiteListUrls).toEqual(['https://example.com', 'https://test.com']);
      });

      it('should throw when no valid URLs are provided', () => {
        process.env.WHITE_LIST_URLS = ',,,';
        process.env.MONGO_CONN_STRING = 'mongodb://localhost:27017/test';
        expect(() => {
          require('./app.config');
        }).toThrow('At least one whitelist URL is required');
      });
    });

    describe('mongoConnString', () => {
      it('should throw when MONGO_CONN_STRING is not set', () => {
        delete process.env.MONGO_CONN_STRING;
        process.env.WHITE_LIST_URLS = 'https://example.com';
        expect(() => {
          require('./app.config');
        }).toThrow('MONGO_CONN_STRING environment variable is required');
      });

      it('should return MONGO_CONN_STRING when set with valid mongodb URL', () => {
        process.env.MONGO_CONN_STRING = 'mongodb://localhost:27017/test';
        jest.resetModules();
        const { appConfig } = require('./app.config') as { appConfig: AppConfig };
        expect(appConfig.mongoConnString).toBe('mongodb://localhost:27017/test');
      });

      it('should accept valid MongoDB SRV connection strings', () => {
        process.env.MONGO_CONN_STRING = 'mongodb+srv://user:pass@cluster.mongodb.net/test';
        jest.resetModules();
        const { appConfig } = require('./app.config') as { appConfig: AppConfig };
        expect(appConfig.mongoConnString).toBe('mongodb+srv://user:pass@cluster.mongodb.net/test');
      });

      it('should throw on invalid MongoDB connection string format', () => {
        process.env.MONGO_CONN_STRING = 'invalid-connection-string';
        process.env.WHITE_LIST_URLS = 'https://example.com';
        expect(() => {
          require('./app.config');
        }).toThrow('MONGO_CONN_STRING must be a valid MongoDB URL (mongodb:// or mongodb+srv://)');
      });

      it('should throw on empty MONGO_CONN_STRING', () => {
        process.env.MONGO_CONN_STRING = '';
        process.env.WHITE_LIST_URLS = 'https://example.com';
        expect(() => {
          require('./app.config');
        }).toThrow('MONGO_CONN_STRING environment variable is required');
      });
    });

    describe('appConfig object', () => {
      it('should export a validated appConfig object', () => {
        const { appConfig } = require('./app.config') as { appConfig: AppConfig };
        expect(appConfig).toHaveProperty('environment');
        expect(appConfig).toHaveProperty('port');
        expect(appConfig).toHaveProperty('whiteListUrls');
        expect(appConfig).toHaveProperty('mongoConnString');
      });

      it('should validate environment enum values', () => {
        process.env.NODE_ENV = 'production';
        jest.resetModules();
        const { appConfig: prodConfig } = require('./app.config') as { appConfig: AppConfig };
        expect(prodConfig.environment).toBe('production');
      });

      it('should validate server configuration', () => {
        process.env.PORT = '8080';
        jest.resetModules();
        const { appConfig: serverConfig } = require('./app.config') as { appConfig: AppConfig };
        expect(serverConfig.port).toBe(8080);
      });

      it('should validate CORS whitelist URLs', () => {
        process.env.WHITE_LIST_URLS = 'https://example.com,https://test.com';
        jest.resetModules();
        const { appConfig: corsConfig } = require('./app.config') as { appConfig: AppConfig };
        expect(corsConfig.whiteListUrls).toEqual(['https://example.com', 'https://test.com']);
      });

      it('should validate MongoDB connection string', () => {
        process.env.MONGO_CONN_STRING = 'mongodb://localhost:27017/test';
        jest.resetModules();
        const { appConfig: dbConfig } = require('./app.config') as { appConfig: AppConfig };
        expect(dbConfig.mongoConnString).toBe('mongodb://localhost:27017/test');
      });

      it('should accept valid MongoDB SRV connection strings', () => {
        process.env.MONGO_CONN_STRING = 'mongodb+srv://user:pass@cluster.mongodb.net/test';
        jest.resetModules();
        const { appConfig: dbConfig } = require('./app.config') as { appConfig: AppConfig };
        expect(dbConfig.mongoConnString).toBe('mongodb+srv://user:pass@cluster.mongodb.net/test');
      });

      it('should throw on invalid MongoDB connection string format', () => {
        process.env.MONGO_CONN_STRING = 'invalid-connection-string';
        process.env.WHITE_LIST_URLS = 'https://example.com';
        expect(() => {
          require('./app.config');
        }).toThrow('MONGO_CONN_STRING must be a valid MongoDB URL (mongodb:// or mongodb+srv://)');
      });

      it('should throw on invalid environment value', () => {
        process.env.NODE_ENV = 'invalid';
        expect(() => {
          require('./app.config');
        }).toThrow('NODE_ENV must be one of: development, production, test');
      });

      it('should throw on invalid port', () => {
        process.env.PORT = '-1';
        expect(() => {
          require('./app.config');
        }).toThrow();
      });

      it('should throw on invalid URL in whitelist', () => {
        process.env.WHITE_LIST_URLS = 'not-a-url,https://valid.com';
        expect(() => {
          require('./app.config');
        }).toThrow();
      });

      it('should accept valid URLs in whitelist', () => {
        process.env.WHITE_LIST_URLS = 'https://example.com,https://test.com';
        jest.resetModules();
        const { appConfig: corsConfig } = require('./app.config') as { appConfig: AppConfig };
        expect(corsConfig.whiteListUrls).toEqual(['https://example.com', 'https://test.com']);
      });
    });
  });
});
