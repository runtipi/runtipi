/* eslint-disable no-console */
import React from 'react';
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock next/router
vi.mock('next/navigation', async () => {
  const router = await import('next-router-mock');

  return router;
});

vi.mock('react-markdown', () => ({
  __esModule: true,
  default: () => <div data-testid="markdown" />,
}));
vi.mock('remark-breaks', () => () => ({}));
vi.mock('remark-gfm', () => () => ({}));
vi.mock('rehype-raw', () => () => ({}));
vi.mock('fs-extra', async () => {
  const { fsMock } = await import('@/tests/mocks/fs');
  return {
    ...fsMock,
  };
});
vi.mock('fs', async () => {
  const { fsMock } = await import('@/tests/mocks/fs');
  return {
    ...fsMock,
  };
});

console.error = vi.fn();

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
Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', { value: vi.fn() });

Object.defineProperty(window, 'matchMedia', {
  value: () => {
    return {
      matches: false,
      addListener: () => {},
      removeListener: () => {},
    };
  },
});
