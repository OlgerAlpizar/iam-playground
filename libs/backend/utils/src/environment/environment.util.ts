/**
 * Checks if the current environment is production.
 * @returns if is production
 */
const isProduction = (): boolean => process.env.NODE_ENV === 'production';

/**
 * Checks if the current environment is development.
 * @returns if is development
 */
const isDevelopment = (): boolean => process.env.NODE_ENV === 'development';

/**
 * Checks if the current environment is test.
 * @returns if is test
 */
const isTest = (): boolean => process.env.NODE_ENV === 'test';

/**
 * Gets the name of the current environment.
 * @returns env name
 */
const getEnvironmentName = (): string => {
  return process.env.NODE_ENV ?? 'development';
};

/**
 * Checks if the current environment matches the given name.
 * @param name - The environment name to check against
 * @returns if matches
 */
const isEnvironment = (name: string): boolean => {
  return process.env.NODE_ENV === name;
};

export const environment = {
  isDevelopment,
  isTest,
  isProduction,
  getEnvironmentName,
  isEnvironment,
} as const;
