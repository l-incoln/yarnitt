module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.+(ts|js)'],
  // Increase timeout for potentially slow integration tests
  testTimeout: 30000
};