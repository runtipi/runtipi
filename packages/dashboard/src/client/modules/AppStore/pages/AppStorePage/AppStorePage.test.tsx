import React from 'react';
import { render, screen, waitFor } from '../../../../../../tests/test-utils';
import appHandlers from '../../../../mocks/handlers/appHandlers';
import { server } from '../../../../mocks/server';
import { AppStorePage } from './AppStorePage';

describe('Test: AppStorePage', () => {
  it('should render error state when error occurs', async () => {
    // Arrange
    server.use(appHandlers.listAppsError);
    render(<AppStorePage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('An error occured')).toBeInTheDocument();
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
    server.use(appHandlers.listAppsEmpty);
    render(<AppStorePage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('No app found')).toBeInTheDocument();
    });
  });
});
