import React, { FC, ReactElement } from 'react';
import { render, RenderOptions, renderHook } from '@testing-library/react';
import { ApolloClient, ApolloProvider, HttpLink, InMemoryCache } from '@apollo/client';
import fetch from 'isomorphic-fetch';
import { TRPCTestClientProvider } from './TRPCTestClientProvider';

const link = new HttpLink({
  uri: 'http://localhost:3000/graphql',
  // Use explicit `window.fetch` so tha outgoing requests
  // are captured and deferred until the Service Worker is ready.
  fetch: (...args) => fetch(...args),
});

// create a mock of Apollo Client
export const mockApolloClient = new ApolloClient({
  cache: new InMemoryCache({}),
  link,
});

const AllTheProviders: FC<{ children: React.ReactNode }> = ({ children }) => (
  <TRPCTestClientProvider>
    <ApolloProvider client={mockApolloClient}>{children}</ApolloProvider>
  </TRPCTestClientProvider>
);

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => render(ui, { wrapper: AllTheProviders, ...options });
const customRenderHook = (callback: () => any, options?: Omit<RenderOptions, 'wrapper'>) => renderHook(callback, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
export { customRenderHook as renderHook };
