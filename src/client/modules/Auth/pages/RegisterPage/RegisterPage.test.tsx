import React from 'react';
import { render, waitFor, screen } from '../../../../../../tests/test-utils';
import { RegisterPage } from './RegisterPage';

describe('Test: RegisterPage', () => {
  it('should render correctly', async () => {
    render(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByText('Register')).toBeInTheDocument();
    });
  });
});
