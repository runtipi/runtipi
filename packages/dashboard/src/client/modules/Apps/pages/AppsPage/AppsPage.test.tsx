import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../../../../../tests/test-utils';
import appHandlers, { mockInstalledAppIds } from '../../../../mocks/handlers/appHandlers';
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
    render(<AppsPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('apps-list')).toBeInTheDocument();
    });
  });

  it('should render all installed apps', async () => {
    // Arrange
    render(<AppsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('apps-list')).toBeInTheDocument();
    });

    // Assert
    const displayedAppIds = screen.getAllByTestId(/app-tile-/);
    expect(displayedAppIds).toHaveLength(mockInstalledAppIds.length);
  });

  it('Should not render app tile if app info is not available', async () => {
    // Arrange
    server.use(appHandlers.installedAppsNoInfo);
    render(<AppsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('apps-list')).toBeInTheDocument();
    });

    // Assert
    expect(screen.queryByTestId(/app-tile-/)).not.toBeInTheDocument();
  });
});

describe('AppsPage - Empty', () => {
  beforeEach(() => {
    server.use(appHandlers.installedAppsEmpty);
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
    await fireEvent.click(actionButton);

    // Assert
    expect(actionButton).toHaveTextContent('Go to app store');
    expect(pushFn).toHaveBeenCalledWith('/app-store');
  });
});

describe('AppsPage - Error', () => {
  beforeEach(() => {
    server.use(appHandlers.installedAppsError);
  });

  it('should render error page if an error occurs', async () => {
    render(<AppsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('error-page')).toBeInTheDocument();
    });

    expect(screen.getByText('test-error')).toHaveTextContent('test-error');
    expect(screen.queryByTestId('apps-list')).not.toBeInTheDocument();
  });
});
