import nextJest from 'next/jest';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

const customClientConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/client/jest.setup.tsx'],
  testMatch: [
    '<rootDir>/src/client/**/*.{spec,test}.{ts,tsx}',
    '<rootDir>/src/app/**/*.{spec,test}.{ts,tsx}',
    '!<rootDir>/src/server/**/*.{spec,test}.{ts,tsx}',
  ],
};

const customServerConfig = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/server/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/server/jest.setup.ts'],
  globals: {
    fetch,
  },
};

export default async () => {
  const clientConfig = await createJestConfig(customClientConfig)();
  const serverConfig = await createJestConfig(customServerConfig)();

  return {
    randomize: true,
    verbose: true,
    collectCoverage: true,
    collectCoverageFrom: [
      'src/server/**/*.{ts,tsx}',
      'src/client/**/*.{ts,tsx}',
      '!src/**/mocks/**/*.{ts,tsx}',
      '!**/*.{spec,test}.{ts,tsx}',
      '!**/index.{ts,tsx}',
    ],
    projects: [
      {
        displayName: 'client',
        ...clientConfig,
      },
      {
        displayName: 'server',
        ...serverConfig,
      },
    ],
  };
};
