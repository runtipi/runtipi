import { graphql } from 'msw';
import React from 'react';
import { render, screen, waitFor } from '../../../../../tests/test-utils';
import { server } from '../../../../mocks/server';
import { SettingsPage } from './SettingsPage';

describe('Test: SettingsPage', () => {
  it('should render', async () => {
    render(<SettingsPage />);

    await waitFor(() => expect(screen.getByText('Tipi settings')).toBeInTheDocument());
  });

  it('should render error page if version query fails', async () => {
    server.use(graphql.query('Version', (req, res, ctx) => res(ctx.errors([{ message: 'My error' }]))));

    render(<SettingsPage />);

    await waitFor(() => expect(screen.getByText('My error')).toBeInTheDocument());
  });
});
