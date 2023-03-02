import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../../../../../tests/test-utils';
import { createAppEntity } from '../../../../mocks/fixtures/app.fixtures';
import { getTRPCMock, getTRPCMockError } from '../../../../mocks/getTrpcMock';
import { server } from '../../../../mocks/server';
import { AppsPage } from './AppsPage';

const pushFn = jest.fn();
jest.mock('next/router', () => {
  const actualRouter = jest.requireActual('next-router-mock');

  return {
    ...actualRouter,
    useRouter: () => ({
      ...actualRouter.useRouter(),
      push: pushFn,
    }),
  };
});

describe('AppsPage', () => {
  it('should render', async () => {
    // Arrange
    const app = createAppEntity({});
    server.use(getTRPCMock({ path: ['app', 'installedApps'], response: [app] }));
    render(<AppsPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('apps-list')).toBeInTheDocument();
    });
  });

  it('should render all installed apps', async () => {
    // Arrange
    const app1 = createAppEntity({});
    const app2 = createAppEntity({});
    server.use(getTRPCMock({ path: ['app', 'installedApps'], response: [app1, app2] }));
    render(<AppsPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('apps-list')).toBeInTheDocument();
    });
    const displayedAppIds = screen.getAllByTestId(/app-tile-/);
    expect(displayedAppIds).toHaveLength(2);
  });

  it('Should not render app tile if app is not available', async () => {
    // Arrange
    const app = createAppEntity({ overridesInfo: { available: false } });
    server.use(getTRPCMock({ path: ['app', 'installedApps'], response: [app] }));
    render(<AppsPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('apps-list')).toBeInTheDocument();
    });
    expect(screen.queryByTestId(/app-tile-/)).not.toBeInTheDocument();
  });
});

describe('AppsPage - Empty', () => {
  beforeEach(() => {
    server.use(getTRPCMock({ path: ['app', 'installedApps'], response: [] }));
  });

  it('should render empty page if no app is installed', async () => {
    // Arrange
    render(<AppsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-page')).toBeInTheDocument();
    });

    // Assert
    expect(screen.queryByTestId('apps-list')).not.toBeInTheDocument();
  });

  it('should trigger navigation to app store on click on action button', async () => {
    // Arrange
    render(<AppsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-page')).toBeInTheDocument();
    });

    // Act
    const actionButton = screen.getByTestId('empty-page-action');
    fireEvent.click(actionButton);

    // Assert
    expect(actionButton).toHaveTextContent('Go to app store');
    expect(pushFn).toHaveBeenCalledWith('/app-store');
  });
});

describe('AppsPage - Error', () => {
  it('should render error page if an error occurs', async () => {
    // Arrange
    server.use(getTRPCMockError({ path: ['app', 'installedApps'], type: 'query', message: 'test-error' }));
    render(<AppsPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('error-page')).toBeInTheDocument();
    });
    expect(screen.getByText('test-error')).toHaveTextContent('test-error');
    expect(screen.queryByTestId('apps-list')).not.toBeInTheDocument();
  });
});
