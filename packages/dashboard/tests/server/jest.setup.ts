import { EventDispatcher } from '../../src/server/core/EventDispatcher';

global.fetch = jest.fn();
console.error = jest.fn();

// Mock Logger
jest.mock('../../src/server/core/Logger', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('next/config', () => () => ({
  serverRuntimeConfig: {
    ...process.env,
  },
}));

afterAll(() => {
  EventDispatcher.clearInterval();
});
