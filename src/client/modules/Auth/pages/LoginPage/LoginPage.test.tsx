import React from 'react';
import { render, screen, waitFor } from '../../../../../../tests/test-utils';
import { getTRPCMock } from '../../../../mocks/getTrpcMock';
import { server } from '../../../../mocks/server';
import { LoginPage } from './LoginPage';

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
describe('Test: LoginPage', () => {
  it('should render correctly', async () => {
    render(<LoginPage />);
    server.use(getTRPCMock({ path: ['auth', 'isConfigured'], response: true }));

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });

  it('should redirect to register page when isConfigured is false', async () => {
    render(<LoginPage />);
    server.use(getTRPCMock({ path: ['auth', 'isConfigured'], response: false }));

    await waitFor(() => {
      expect(pushFn).toBeCalledWith('/register');
    });
  });
});
