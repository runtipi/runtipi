/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  verbose: true,
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/src/test/dotenv-config.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/jest-setup.ts'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/migrations/**/*.{ts,tsx}', '!**/src/config/**/*.{ts,tsx}', '!**/__tests__/**'],
  passWithNoTests: true,
  transform: {
    '^.+\\.graphql$': 'graphql-import-node/jest',
  },
  globals: {
    // NODE_ENV: 'test',
    'ts-jest': {
      isolatedModules: true,
    },
  },
};
