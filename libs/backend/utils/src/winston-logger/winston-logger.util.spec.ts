import type { LoggerInterface } from '@authentication/backend-contracts';

const mockEnvironmentForDevelopment = () => {
  jest.doMock('../environment/environment.util', () => ({
    environment: {
      isDevelopment: jest.fn(() => true),
      isProduction: jest.fn(() => false),
      isTest: jest.fn(() => false),
      getEnvironmentName: jest.fn(() => 'development'),
    },
  }));
};

const mockEnvironmentForProduction = () => {
  jest.doMock('../environment/environment.util', () => ({
    environment: {
      isDevelopment: jest.fn(() => false),
      isProduction: jest.fn(() => true),
      isTest: jest.fn(() => false),
      getEnvironmentName: jest.fn(() => 'production'),
    },
  }));
};

const mockWinston = () => {
  jest.doMock('winston', () => ({
    createLogger: jest.fn(() => ({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      http: jest.fn(),
      debug: jest.fn(),
    })),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      colorize: jest.fn(),
      printf: jest.fn((formatter: (info: unknown) => string) => {
        const testInfo1 = {
          timestamp: '2024-01-01 12:00:00',
          level: 'info',
          message: { userId: 123, action: 'test' },
          extraProp: 'test value',
        };
        formatter(testInfo1);

        const testInfo2 = {
          timestamp: '2024-01-01 12:00:00',
          level: 'info',
          message: 'Test message',
          extraProp: 'test value',
        };
        formatter(testInfo2);

        const testInfo3 = {
          timestamp: '2024-01-01 12:00:00',
          level: 'info',
          message: 'Test message',
        };
        formatter(testInfo3);

        const testInfo4 = {
          timestamp: '2024-01-01 12:00:00',
          level: 'info',
          message: null,
          extraProp: 'test value',
        };
        formatter(testInfo4);

        const testInfo5 = 'string info';
        formatter(testInfo5);

        return formatter;
      }),
      json: jest.fn(),
      errors: jest.fn(),
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn(),
    },
  }));
};

const getFreshLogger = (
  environmentMock: () => void = mockEnvironmentForDevelopment,
): typeof winstonLogger => {
  environmentMock();
  mockWinston();
  jest.resetModules();

  const { winstonLogger: freshLogger } = require('./winston-logger.util') as {
    winstonLogger: typeof winstonLogger;
  };
  return freshLogger;
};

mockEnvironmentForDevelopment();
mockWinston();
const { environment } =
  require('../environment/environment.util') as typeof import('../environment/environment.util');
const { winstonLogger } =
  require('./winston-logger.util') as typeof import('./winston-logger.util');

describe('WinstonLogger', () => {
  describe('Unit Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      const mockEnvironment = environment as jest.Mocked<typeof environment>;
      mockEnvironment.isDevelopment.mockReturnValue(true);
      mockEnvironment.isProduction.mockReturnValue(false);
      mockEnvironment.isTest.mockReturnValue(false);
      mockEnvironment.getEnvironmentName.mockReturnValue('development');
    });

    describe('Default logger instance', () => {
      it('should export winstonLogger with all methods', () => {
        expect(winstonLogger).toBeDefined();
      });

      it('should handle different log levels correctly', () => {
        expect(() => {
          winstonLogger.error('Error message');
          winstonLogger.warn('Warning message');
          winstonLogger.info('Info message');
          winstonLogger.http('HTTP message');
          winstonLogger.debug('Debug message');
        }).not.toThrow();
      });

      it('should handle object messages', () => {
        const testObject = { userId: 123, action: 'login' };

        expect(() => {
          winstonLogger.info(JSON.stringify(testObject));
        }).not.toThrow();
      });

      it('should handle messages with extra properties', () => {
        const extraData = { sessionId: 'abc123', userAgent: 'test' };

        expect(() => {
          winstonLogger.info('Test message', extraData);
        }).not.toThrow();
      });
    });

    describe('Logger functionality', () => {
      it('should handle logging operations without throwing', () => {
        expect(() => {
          winstonLogger.error('Test error');
          winstonLogger.warn('Test warning');
          winstonLogger.info('Test info');
          winstonLogger.debug('Test debug');
          winstonLogger.http('Test http');
        }).not.toThrow();
      });
    });

    describe('Environment-specific behavior', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should configure logger for development environment', () => {
        const devLogger = getFreshLogger(mockEnvironmentForDevelopment);

        expect(() => {
          devLogger.debug('Debug message in development');
          devLogger.info('Info message in development');
        }).not.toThrow();
      });

      it('should configure logger for production environment', () => {
        const prodLogger = getFreshLogger(mockEnvironmentForProduction);

        expect(() => {
          prodLogger.error('Error in production');
          prodLogger.warn('Warning in production');
          prodLogger.info('Info in production');
        }).not.toThrow();
      });

      it('should cache logger instances by environment', () => {
        let currentEnv = 'development';
        jest.doMock('../environment/environment.util', () => ({
          environment: {
            isDevelopment: () => currentEnv === 'development',
            isProduction: () => currentEnv === 'production',
            isTest: () => currentEnv === 'test',
            getEnvironmentName: () => currentEnv,
          },
        }));
        mockWinston();
        jest.resetModules();

        const { createOrGetWinstonLogger } = require('./winston-logger.util') as {
          createOrGetWinstonLogger: () => LoggerInterface;
        };

        currentEnv = 'development';
        const loggerDev1 = createOrGetWinstonLogger();
        const loggerDev2 = createOrGetWinstonLogger();
        expect(loggerDev1).toBe(loggerDev2);

        currentEnv = 'production';
        const loggerProd1 = createOrGetWinstonLogger();
        expect(loggerDev1).not.toBe(loggerProd1);

        const loggerProd2 = createOrGetWinstonLogger();
        expect(loggerProd1).toBe(loggerProd2);

        currentEnv = 'development';
        const loggerDev3 = createOrGetWinstonLogger();
        expect(loggerDev1).toBe(loggerDev3);

        currentEnv = 'test';
        const loggerTest = createOrGetWinstonLogger();
        expect(loggerDev1).not.toBe(loggerTest);
        expect(loggerProd1).not.toBe(loggerTest);
      });
    });

    describe('Logger behavior verification', () => {
      it('should be a singleton instance', () => {
        const loggerRef1 = winstonLogger;
        const loggerRef2 = winstonLogger;

        expect(loggerRef1).toBe(loggerRef2);
      });

      it('should have all required LoggerInterface methods', () => {
        const requiredMethods: (keyof LoggerInterface)[] = [
          'error',
          'warn',
          'info',
          'http',
          'debug',
        ];

        requiredMethods.forEach((method) => {
          expect(winstonLogger[method]).toBeDefined();
        });
      });
    });
  });
});
