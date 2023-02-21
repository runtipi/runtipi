import React from 'react';
import { render, screen, waitFor } from '../../../../tests/test-utils';
import { getTRPCMock, getTRPCMockError } from '../../mocks/getTrpcMock';
import { server } from '../../mocks/server';
import { Layout } from './Layout';

const pushFn = jest.fn();
jest.mock('next/router', () => {
  const actualRouter = jest.requireActual('next-router-mock');

  return {
    ...actualRouter,
    useRouter: () => ({
      ...actualRouter.useRouter(),
      push: pushFn,
    }),
  };
});

describe('Test: Layout', () => {
  it('should render correctly its children', () => {
    render(<Layout>test</Layout>);

    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('should correctly set token in localStorage when refreshToken is called', async () => {
    // Arranger
    server.use(getTRPCMock({ path: ['auth', 'refreshToken'], type: 'mutation', response: { token: 'fake-token' } }));
    render(<Layout>test</Layout>);

    // Act
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('fake-token');
    });
  });

  it('should remove token from local storage and redirect to login page on error', async () => {
    // Arranger
    server.use(getTRPCMockError({ path: ['auth', 'refreshToken'], type: 'mutation', message: 'fake-error' }));
    render(<Layout>test</Layout>);
    const removeItemSpy = jest.spyOn(localStorage, 'removeItem');

    // Act
    await waitFor(() => {
      expect(removeItemSpy).toBeCalledWith('token');
      expect(pushFn).toBeCalledWith('/login');
    });
  });
});
