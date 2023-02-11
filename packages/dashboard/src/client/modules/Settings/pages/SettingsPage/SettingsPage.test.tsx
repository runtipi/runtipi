import { faker } from '@faker-js/faker';
import React from 'react';
import { render, screen, waitFor } from '../../../../../../tests/test-utils';
import { getTRPCMockError } from '../../../../mocks/getTrpcMock';
import { server } from '../../../../mocks/server';
import { SettingsPage } from './SettingsPage';

describe('Test: SettingsPage', () => {
  it('should render', async () => {
    render(<SettingsPage />);

    await waitFor(() => expect(screen.getByTestId('settings-layout')).toBeInTheDocument());
  });

  it('should display error page if error is present', async () => {
    const error = faker.lorem.sentence();
    server.use(getTRPCMockError({ path: ['system', 'getVersion'], message: error }));

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(error)).toBeInTheDocument();
    });
  });
});
