import React from 'react';
import { render, screen } from '../../../../../tests/test-utils';
import { getTRPCMock } from '../../../mocks/getTrpcMock';
import { server } from '../../../mocks/server';
import { AuthProvider } from './AuthProvider';

describe('Test: AuthProvider', () => {
  it('should render login form if user is not logged in', async () => {
    // arrange
    render(
      <AuthProvider>
        <div>Should not render</div>
      </AuthProvider>,
    );
    server.use(getTRPCMock({ path: ['auth', 'me'], type: 'query', response: null }));

    // assert
    await screen.findByText('Login');
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
  });

  it('should render children if user is logged in', async () => {
    // arrange
    render(
      <AuthProvider>
        <div>Should render</div>
      </AuthProvider>,
    );

    // assert
    await screen.findByText('Should render');
  });

  it('should render register form if app is not configured', async () => {
    // arrange
    server.use(getTRPCMock({ path: ['auth', 'me'], type: 'query', response: null }));
    server.use(getTRPCMock({ path: ['auth', 'isConfigured'], type: 'query', response: false }));

    render(
      <AuthProvider>
        <div>Should not render</div>
      </AuthProvider>,
    );

    // assert
    await screen.findByText('Register your account');
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
  });
});
