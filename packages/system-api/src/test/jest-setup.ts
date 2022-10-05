import { eventDispatcher } from '../core/config/EventDispatcher';

jest.mock('../config/logger/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

afterAll(() => {
  eventDispatcher.clear();
});
