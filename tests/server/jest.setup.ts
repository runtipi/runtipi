import { fromPartial } from '@total-typescript/shoehorn';
import { EventDispatcher } from '../../src/server/core/EventDispatcher';

global.fetch = jest.fn();
// Mock global location
global.location = fromPartial({
  hostname: 'localhost',
});

console.error = jest.fn();

// Mock Logger
jest.mock('../../src/server/core/Logger', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
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
