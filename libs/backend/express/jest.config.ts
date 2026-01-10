export default {
  displayName: 'backend-express',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.[jt]s', '<rootDir>/src/**/*(*.)@(spec|test).[jt]s'],
  coverageDirectory: '../../../../coverage/libs/backend/express',
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.spec.{ts,js}',
    '!src/**/*.test.{ts,js}',
    '!src/**/__tests__/**',
    '!src/**/index.{ts,js}',
  ],
  coverageReporters: ['html', 'text', 'lcov', 'json'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '.*\\.spec\\.ts$',
    '.*\\.test\\.ts$',
    '/index\\.ts$',
  ],
  moduleNameMapper: {
    '^@authentication/backend-utils$': '<rootDir>/../../../libs/backend/utils/src/index.ts',
    '^@authentication/express$': '<rootDir>/../../../libs/backend/express/src/index.ts',
  },
};
