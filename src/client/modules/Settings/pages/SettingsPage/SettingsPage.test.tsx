import React from 'react';
import { render, screen, waitFor } from '../../../../../../tests/test-utils';
import { SettingsPage } from './SettingsPage';

describe('Test: SettingsPage', () => {
  it('should render', async () => {
    render(<SettingsPage />);

    await waitFor(() => expect(screen.getByTestId('settings-layout')).toBeInTheDocument());
  });
});
