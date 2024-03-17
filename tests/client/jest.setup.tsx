import React from 'react';
import '@testing-library/jest-dom';

// Mock next/router
// eslint-disable-next-line global-require
jest.mock('next/router', () => require('next-router-mock'));
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: () => <div data-testid="markdown" />,
}));
jest.mock('remark-breaks', () => () => ({}));
jest.mock('remark-gfm', () => () => ({}));
jest.mock('rehype-raw', () => () => ({}));
jest.mock('fs');

console.error = jest.fn();

class ResizeObserver {
  observe() {}

  unobserve() {}

  disconnect() {}
}

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
Object.defineProperty(window, 'ResizeObserver', { value: ResizeObserver });
Object.defineProperty(window, 'MutationObserver', { value: ResizeObserver });

Object.defineProperty(window, 'matchMedia', {
  value: () => {
    return {
      matches: false,
      addListener: () => {},
      removeListener: () => {},
    };
  },
});
