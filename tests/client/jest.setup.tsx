import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { server } from '../../src/client/mocks/server';
import { useToastStore } from '../../src/client/state/toastStore';

// Mock next/router
// eslint-disable-next-line global-require
jest.mock('next/router', () => require('next-router-mock'));
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: () => <div data-testid="markdown" />,
}));
jest.mock('remark-breaks', () => () => ({}));
jest.mock('remark-gfm', () => () => ({}));

console.error = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeAll(() => {
  // Enable the mocking in tests.
  server.listen();
});

beforeEach(async () => {
  useToastStore.getState().clearToasts();
});

afterEach(() => {
  // Reset any runtime handlers tests may use.
  server.resetHandlers();
});

afterAll(() => {
  // Clean up once the tests are done.
  server.close();
});
