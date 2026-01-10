const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  testPathIgnorePatterns: ['/node_modules/', '/dist/', 'e2e', '-e2e/'],
};
