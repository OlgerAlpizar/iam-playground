import { environment } from './environment.util';

describe('Environment Util', () => {
  describe('Unit Tests', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv, NODE_ENV: 'development' };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    describe('isProduction', () => {
      it('should return true when environment is production', () => {
        process.env.NODE_ENV = 'production';

        expect(environment.isProduction()).toBe(true);
      });

      it('should return false when environment is not production', () => {
        process.env.NODE_ENV = 'development';

        expect(environment.isProduction()).toBe(false);
      });
    });

    describe('isDevelopment', () => {
      it('should return true when environment is development', () => {
        process.env.NODE_ENV = 'development';

        expect(environment.isDevelopment()).toBe(true);
      });

      it('should return false when environment is not development', () => {
        process.env.NODE_ENV = 'production';

        expect(environment.isDevelopment()).toBe(false);
      });
    });

    describe('isTest', () => {
      it('should return true when environment is test', () => {
        process.env.NODE_ENV = 'test';

        expect(environment.isTest()).toBe(true);
      });

      it('should return false when environment is not test', () => {
        process.env.NODE_ENV = 'development';

        expect(environment.isTest()).toBe(false);
      });
    });

    describe('getEnvironmentName', () => {
      it('should return the environment name when NODE_ENV is set', () => {
        process.env.NODE_ENV = 'production';

        expect(environment.getEnvironmentName()).toBe('production');
      });

      it('should return "development" when NODE_ENV is undefined', () => {
        delete process.env.NODE_ENV;

        expect(environment.getEnvironmentName()).toBe('development');
      });

      it('should return empty string when NODE_ENV is an empty string', () => {
        process.env.NODE_ENV = '';

        expect(environment.getEnvironmentName()).toBe('');
      });

      it('should return custom environment names', () => {
        process.env.NODE_ENV = 'staging';

        expect(environment.getEnvironmentName()).toBe('staging');
      });
    });

    describe('isEnvironment', () => {
      it('should return true when environment matches the given name', () => {
        process.env.NODE_ENV = 'production';

        expect(environment.isEnvironment('production')).toBe(true);
      });

      it('should return false when environment does not match the given name', () => {
        process.env.NODE_ENV = 'development';

        expect(environment.isEnvironment('production')).toBe(false);
      });

      it('should handle custom environment names', () => {
        process.env.NODE_ENV = 'staging';

        expect(environment.isEnvironment('staging')).toBe(true);
        expect(environment.isEnvironment('production')).toBe(false);
      });

      it('should return false when NODE_ENV is undefined', () => {
        delete process.env.NODE_ENV;

        expect(environment.isEnvironment('development')).toBe(false);
      });

      it('should be case sensitive', () => {
        process.env.NODE_ENV = 'Production';

        expect(environment.isEnvironment('Production')).toBe(true);
        expect(environment.isEnvironment('production')).toBe(false);
      });
    });

    describe('Environment object structure', () => {
      it('should export all required methods', () => {
        expect(environment).toHaveProperty('isProduction');
        expect(environment).toHaveProperty('isDevelopment');
        expect(environment).toHaveProperty('isTest');
        expect(environment).toHaveProperty('getEnvironmentName');
        expect(environment).toHaveProperty('isEnvironment');
      });
    });

    describe('Edge cases', () => {
      it('should handle various environment values correctly', () => {
        const testCases = [
          {
            env: 'production',
            isProd: true,
            isDev: false,
            isTest: false,
            expectedName: 'production',
          },
          {
            env: 'development',
            isProd: false,
            isDev: true,
            isTest: false,
            expectedName: 'development',
          },
          { env: 'test', isProd: false, isDev: false, isTest: true, expectedName: 'test' },
          { env: 'staging', isProd: false, isDev: false, isTest: false, expectedName: 'staging' },
          { env: 'ci', isProd: false, isDev: false, isTest: false, expectedName: 'ci' },
          { env: '', isProd: false, isDev: false, isTest: false, expectedName: '' },
          {
            env: undefined,
            isProd: false,
            isDev: false,
            isTest: false,
            expectedName: 'development',
          },
        ];

        testCases.forEach(({ env, isProd, isDev, isTest: isTestEnv, expectedName }) => {
          if (env === undefined) {
            delete process.env.NODE_ENV;
          } else {
            process.env.NODE_ENV = env;
          }

          expect(environment.isProduction()).toBe(isProd);
          expect(environment.isDevelopment()).toBe(isDev);
          expect(environment.isTest()).toBe(isTestEnv);
          expect(environment.getEnvironmentName()).toBe(expectedName);
        });
      });
    });
  });
});
