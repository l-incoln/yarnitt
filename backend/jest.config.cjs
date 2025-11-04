module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.(ts|js)'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  testTimeout: 30000
};