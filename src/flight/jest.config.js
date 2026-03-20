/** @type {import('jest').Config} */
module.exports = {
  displayName: 'flight',
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/test/$1'
  },
  testTimeout: 90000,
  testPathIgnorePatterns: ['<rootDir>/dist/']
};
