import React from 'react';
import { render, screen, waitFor } from '../../../../../../tests/test-utils';
import { AppWithInfo } from '../../../../core/types';
import { createAppEntity } from '../../../../mocks/fixtures/app.fixtures';
import { getTRPCMock } from '../../../../mocks/getTrpcMock';
import { server } from '../../../../mocks/server';
import { AppDetailsPage } from './AppDetailsPage';

describe('AppDetailsPage', () => {
  it('should render', async () => {
    // Arrange
    render(<AppDetailsPage appId="nothing" />);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('app-details')).toBeInTheDocument();
    });
  });

  it('should set the breadcrumb prop of the Layout component to an array containing two elements with the correct name and href properties', async () => {
    // Arrange
    const app = createAppEntity({}) as AppWithInfo;
    server.use(
      getTRPCMock({
        path: ['app', 'getApp'],
        response: app,
      }),
    );

    jest.mock('next/router', () => {
      const actualRouter = jest.requireActual('next-router-mock');

      return {
        ...actualRouter,
        useRouter: () => ({
          ...actualRouter.useRouter(),
          pathname: `/apps/${app.id}`,
        }),
      };
    });

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

    expect(breadcrumbs[1]).toHaveTextContent(app.info.name);
    expect(breadcrumbsLinks[1]).toHaveAttribute('href', `/apps/${app.id}`);
  });
});
