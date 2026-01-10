export default {
  displayName: 'backend-database',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.[jt]s', '<rootDir>/src/**/*(*.)@(spec|test).[jt]s'],
  coverageDirectory: '../../../../coverage/libs/backend/database',
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
};
