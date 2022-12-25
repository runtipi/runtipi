import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import 'whatwg-fetch';
import { server } from '../src/client/mocks/server';
import { mockApolloClient } from './test-utils';
import { useToastStore } from '../src/client/state/toastStore';

// Mock next/router
// eslint-disable-next-line global-require
jest.mock('next/router', () => require('next-router-mock'));
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: () => <div data-testid="markdown" />,
}));
jest.mock('remark-breaks', () => () => ({}));
jest.mock('remark-gfm', () => () => ({}));
jest.mock('remark-mdx', () => () => ({}));

beforeAll(() => {
  // Enable the mocking in tests.
  server.listen();
});

beforeEach(async () => {
  useToastStore.getState().clearToasts();
  // Ensure Apollo cache is cleared between tests.
  // https://www.apollographql.com/docs/react/api/core/ApolloClient/#ApolloClient.clearStore
  await mockApolloClient.clearStore();
  await mockApolloClient.cache.reset();
});

afterEach(() => {
  // Reset any runtime handlers tests may use.
  server.resetHandlers();
});

afterAll(() => {
  // Clean up once the tests are done.
  server.close();
});
