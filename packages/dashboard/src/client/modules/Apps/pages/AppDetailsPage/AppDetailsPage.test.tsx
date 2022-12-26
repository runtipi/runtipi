import React from 'react';
import { render, screen, waitFor } from '../../../../../../tests/test-utils';
import { AppInfo } from '../../../../generated/graphql';
import appHandlers, { mockedApps, mockInstalledAppIds } from '../../../../mocks/handlers/appHandlers';
import { server } from '../../../../mocks/server';
import { AppDetailsPage } from './AppDetailsPage';

describe('AppDetailsPage', () => {
  it('should render', async () => {
    // Arrange
    render(<AppDetailsPage appId={mockInstalledAppIds[0] as string} />);
    await waitFor(() => {
      expect(screen.getByTestId('app-details')).toBeInTheDocument();
    });
  });

  it('should correctly pass the appId to the AppDetailsContainer', async () => {
    // Arrange
    const props = AppDetailsPage.getInitialProps?.({ query: { id: mockInstalledAppIds[0] } } as any);

    // Assert
    expect(props).toHaveProperty('appId', mockInstalledAppIds[0]);
  });

  it('should transform the appId to a string', async () => {
    // Arrange
    const props = AppDetailsPage.getInitialProps?.({ query: { id: [123] } } as any);

    // Assert
    expect(props).toHaveProperty('appId', '123');
  });

  it('should render the error page when an error occurs', async () => {
    // Arrange
    server.use(appHandlers.getAppError);
    render(<AppDetailsPage appId={mockInstalledAppIds[0] as string} />);
    await waitFor(() => {
      expect(screen.getByTestId('error-page')).toBeInTheDocument();
    });

    // Assert
    expect(screen.getByText('test-error')).toHaveTextContent('test-error');
  });

  it('should set the breadcrumb prop of the Layout component to an array containing two elements with the correct name and href properties', async () => {
    // Arrange
    const app = mockedApps[0] as AppInfo;
    render(<AppDetailsPage appId={app.id} />);
    await waitFor(() => {
      expect(screen.getByTestId('app-details')).toBeInTheDocument();
    });

    // Act
    const breadcrumbs = await screen.findAllByTestId('breadcrumb-item');
    const breadcrumbsLinks = await screen.findAllByTestId('breadcrumb-link');

    // Assert
    expect(breadcrumbs[0]).toHaveTextContent('Apps');
    expect(breadcrumbsLinks[0]).toHaveAttribute('href', '/apps');

    expect(breadcrumbs[1]).toHaveTextContent(app.name);
    expect(breadcrumbsLinks[1]).toHaveAttribute('href', `/apps/${app.id}`);
  });
});
