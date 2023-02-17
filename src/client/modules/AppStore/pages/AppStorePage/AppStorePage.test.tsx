import React from 'react';
import { render, screen, waitFor } from '../../../../../../tests/test-utils';
import { getTRPCMock, getTRPCMockError } from '../../../../mocks/getTrpcMock';
import { server } from '../../../../mocks/server';
import { AppStorePage } from './AppStorePage';

describe('Test: AppStorePage', () => {
  it('should render error state when error occurs', async () => {
    // Arrange
    server.use(getTRPCMockError({ path: ['app', 'listApps'], message: 'test error' }));
    render(<AppStorePage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('An error occured')).toBeInTheDocument();
      expect(screen.getByText('test error')).toBeInTheDocument();
    });
  });

  it('should render', async () => {
    // Arrange
    render(<AppStorePage />);
    expect(screen.getByTestId('app-store-layout')).toBeInTheDocument();
  });

  it('should render app store table', async () => {
    // Arrange
    render(<AppStorePage />);
    expect(screen.getByTestId('app-store-layout')).toBeInTheDocument();

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('app-store-table')).toBeInTheDocument();
    });
  });

  it('should render app store table loading when data is not here', async () => {
    // Arrange
    render(<AppStorePage />);
    expect(screen.getByTestId('app-store-layout')).toBeInTheDocument();

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('app-store-table-loading')).toBeInTheDocument();
    });
  });

  it('should render empty state when no apps are available', async () => {
    // Arrange
    server.use(getTRPCMock({ path: ['app', 'listApps'], response: { apps: [], total: 0 } }));

    render(<AppStorePage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('No app found')).toBeInTheDocument();
    });
  });
});
