import React from 'react';
import { render, screen } from '../../../../../tests/test-utils';
import { DashboardPage } from './DashboardPage';

describe('Test: DashboardPage', () => {
  it('should render', async () => {
    // Arrange
    render(<DashboardPage />);
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });
});
