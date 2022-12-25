import { graphql } from 'msw';
import React from 'react';
import { render, screen, waitFor } from '../../../../../tests/test-utils';
import { server } from '../../../mocks/server';
import { AuthProvider } from './AuthProvider';

describe('Test: AuthProvider', () => {
  it('should render login form if user is not logged in', async () => {
    render(
      <AuthProvider>
        <div>Should not render</div>
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('Login')).toBeInTheDocument());
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
  });

  it('should render children if user is logged in', async () => {
    server.use(graphql.query('Me', (req, res, ctx) => res(ctx.data({ me: { id: '1' } }))));

    render(
      <AuthProvider>
        <div>Should render</div>
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('Should render')).toBeInTheDocument());
  });

  it('should render register form if app is not configured', async () => {
    server.use(graphql.query('Configured', (req, res, ctx) => res(ctx.data({ isConfigured: false }))));

    render(
      <AuthProvider>
        <div>Should not render</div>
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('Register')).toBeInTheDocument());
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
  });
});
