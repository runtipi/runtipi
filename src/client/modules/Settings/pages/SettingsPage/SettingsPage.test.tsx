import React from 'react';
import { render, screen } from '../../../../../../tests/test-utils';
import { SettingsPage } from './SettingsPage';

describe('Test: SettingsPage', () => {
  it('should render', async () => {
    render(<SettingsPage />);

    await screen.findByTestId('settings-layout');
  });
});
