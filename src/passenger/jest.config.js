/** @type {import('jest').Config} */
module.exports = {
  displayName: 'passenger',
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/test/$1'
  },
  testPathIgnorePatterns: ['<rootDir>/dist/'],
  testTimeout: 90000
};
