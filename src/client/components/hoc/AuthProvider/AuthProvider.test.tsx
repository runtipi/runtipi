import React from 'react';
import { render, screen, waitFor } from '../../../../../tests/test-utils';
import { getTRPCMock } from '../../../mocks/getTrpcMock';
import { server } from '../../../mocks/server';
import { AuthProvider } from './AuthProvider';

describe('Test: AuthProvider', () => {
  it('should render login form if user is not logged in', async () => {
    render(
      <AuthProvider>
        <div>Should not render</div>
      </AuthProvider>,
    );
    server.use(getTRPCMock({ path: ['auth', 'me'], type: 'query', response: null }));
    await waitFor(() => expect(screen.getByText('Login')).toBeInTheDocument());
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
  });

  it('should render children if user is logged in', async () => {
    render(
      <AuthProvider>
        <div>Should render</div>
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('Should render')).toBeInTheDocument());
  });

  it('should render register form if app is not configured', async () => {
    server.use(getTRPCMock({ path: ['auth', 'me'], type: 'query', response: null }));
    server.use(getTRPCMock({ path: ['auth', 'isConfigured'], type: 'query', response: false }));

    render(
      <AuthProvider>
        <div>Should not render</div>
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('Register your account')).toBeInTheDocument());
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
  });
});
