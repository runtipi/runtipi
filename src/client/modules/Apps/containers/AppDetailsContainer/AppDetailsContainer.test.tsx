import React from 'react';
import { faker } from '@faker-js/faker';
import { fireEvent, render, screen, waitFor } from '../../../../../../tests/test-utils';
import { createAppEntity } from '../../../../mocks/fixtures/app.fixtures';
import { getTRPCMock, getTRPCMockError } from '../../../../mocks/getTrpcMock';
import { server } from '../../../../mocks/server';
import { AppDetailsContainer } from './AppDetailsContainer';

describe('Test: AppDetailsContainer', () => {
  describe('Test: UI', () => {
    it('should render', async () => {
      // Arrange
      const app = createAppEntity({});
      render(<AppDetailsContainer app={app} />);

      // Assert
      expect(screen.getByText(app.info.short_desc)).toBeInTheDocument();
    });

    it('should display update button when update is available', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { version: 2, latestVersion: 3 } });
      render(<AppDetailsContainer app={app} />);

      // Assert
      expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
    });

    it('should display install button when app is not installed', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { status: 'missing' } });

      render(<AppDetailsContainer app={app} />);

      // Assert
      expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
    });

    it('should display uninstall and start button when app is stopped', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { status: 'stopped' } });

      render(<AppDetailsContainer app={app} />);

      // Assert
      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    });

    it('should display stop, open and settings buttons when app is running', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { status: 'running' } });
      render(<AppDetailsContainer app={app} />);

      // Assert
      expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    });

    it('should not display update button when update is not available', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { version: 3 }, overridesInfo: { tipi_version: 3 } });
      render(<AppDetailsContainer app={app} />);

      // Assert
      expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
    });

    it('should not display open button when app has no_gui set to true', async () => {
      // Arrange
      const app = createAppEntity({ overridesInfo: { no_gui: true } });
      render(<AppDetailsContainer app={app} />);

      // Assert
      expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument();
    });
  });

  describe('Test: Open app', () => {
    it('should call window.open with the correct url when open button is clicked', async () => {
      // Arrange
      const app = createAppEntity({});
      const spy = jest.spyOn(window, 'open').mockImplementation(() => null);
      render(<AppDetailsContainer app={app} />);

      // Act
      const openButton = screen.getByRole('button', { name: 'Open' });
      openButton.click();

      // Assert
      expect(spy).toHaveBeenCalledWith(`http://localhost:${app.info.port}`, '_blank', 'noreferrer');
    });

    it('should open with https when app info has https set to true', async () => {
      // Arrange
      const app = createAppEntity({ overridesInfo: { https: true } });
      const spy = jest.spyOn(window, 'open').mockImplementation(() => null);
      render(<AppDetailsContainer app={app} />);

      // Act
      const openButton = screen.getByRole('button', { name: 'Open' });
      openButton.click();

      // Assert
      expect(spy).toHaveBeenCalledWith(`https://localhost:${app.info.port}`, '_blank', 'noreferrer');
    });
  });

  describe('Test: Install app', () => {
    it('should display toast success when install success', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { status: 'missing' } });
      server.use(getTRPCMock({ path: ['app', 'installApp'], type: 'mutation', response: app }));
      render(<AppDetailsContainer app={app} />);
      const openModalButton = screen.getByRole('button', { name: 'Install' });
      fireEvent.click(openModalButton);

      // Act
      const installButton = screen.getByRole('button', { name: 'Install' });
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(screen.getByText('App installed successfully')).toBeInTheDocument();
      });
    });

    it('should display a toast error when install mutation fails', async () => {
      // Arrange
      const error = faker.lorem.sentence();
      server.use(
        getTRPCMockError({
          path: ['app', 'installApp'],
          type: 'mutation',
          message: error,
        }),
      );

      const app = createAppEntity({ overrides: { status: 'missing' } });
      render(<AppDetailsContainer app={app} />);
      const openModalButton = screen.getByRole('button', { name: 'Install' });
      fireEvent.click(openModalButton);

      // Act
      const installButton = screen.getByRole('button', { name: 'Install' });
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(screen.getByText(error)).toBeInTheDocument();
      });
    });
  });

  describe('Test: Update app', () => {
    it('should display toast success when update success', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { version: 2, latestVersion: 3 } });
      server.use(getTRPCMock({ path: ['app', 'updateApp'], type: 'mutation', response: app }));
      render(<AppDetailsContainer app={app} />);
      const openModalButton = screen.getByRole('button', { name: 'Update' });
      fireEvent.click(openModalButton);

      // Act
      const modalUpdateButton = screen.getByRole('button', { name: 'Update' });
      modalUpdateButton.click();

      await waitFor(() => {
        expect(screen.getByText('App updated successfully')).toBeInTheDocument();
      });
    });

    it('should display a toast error when update mutation fails', async () => {
      // Arrange
      const error = faker.lorem.sentence();
      server.use(getTRPCMockError({ path: ['app', 'updateApp'], type: 'mutation', message: error }));
      const app = createAppEntity({ overrides: { version: 2, latestVersion: 3 }, overridesInfo: { tipi_version: 3 } });
      render(<AppDetailsContainer app={app} />);
      const openModalButton = screen.getByRole('button', { name: 'Update' });
      fireEvent.click(openModalButton);

      // Act
      const modalUpdateButton = screen.getByRole('button', { name: 'Update' });
      modalUpdateButton.click();

      // Assert
      await waitFor(() => {
        expect(screen.getByText(error)).toBeInTheDocument();
      });
    });
  });

  describe('Test: Uninstall app', () => {
    it('should display toast success when uninstall success', async () => {
      // Arrange
      const app = createAppEntity({ status: 'stopped' });
      server.use(getTRPCMock({ path: ['app', 'uninstallApp'], type: 'mutation', response: { id: app.id, config: {}, status: 'missing' } }));
      render(<AppDetailsContainer app={app} />);
      const openModalButton = screen.getByRole('button', { name: 'Remove' });
      fireEvent.click(openModalButton);

      // Act
      const modalUninstallButton = screen.getByRole('button', { name: 'Uninstall' });
      modalUninstallButton.click();

      // Assert
      await waitFor(() => {
        expect(screen.getByText('App uninstalled successfully')).toBeInTheDocument();
      });
    });

    it('should display a toast error when uninstall mutation fails', async () => {
      // Arrange
      const error = faker.lorem.sentence();
      server.use(getTRPCMockError({ path: ['app', 'uninstallApp'], type: 'mutation', message: error }));
      const app = createAppEntity({ status: 'stopped' });
      render(<AppDetailsContainer app={app} />);
      const openModalButton = screen.getByRole('button', { name: 'Remove' });
      fireEvent.click(openModalButton);

      // Act
      const modalUninstallButton = screen.getByRole('button', { name: 'Uninstall' });
      modalUninstallButton.click();

      // Assert
      await waitFor(() => {
        expect(screen.getByText(error)).toBeInTheDocument();
      });
    });
  });

  describe('Test: Start app', () => {
    it('should display toast success when start success', async () => {
      // Arrange
      const app = createAppEntity({ status: 'stopped' });
      server.use(getTRPCMock({ path: ['app', 'startApp'], type: 'mutation', response: app }));
      render(<AppDetailsContainer app={app} />);

      // Act
      const startButton = screen.getByRole('button', { name: 'Start' });
      startButton.click();

      // Assert
      await waitFor(() => {
        expect(screen.getByText('App started successfully')).toBeInTheDocument();
      });
    });

    it('should display a toast error when start mutation fails', async () => {
      // Arrange
      const error = faker.lorem.sentence();
      server.use(getTRPCMockError({ path: ['app', 'startApp'], type: 'mutation', message: error }));
      const app = createAppEntity({ status: 'stopped' });
      render(<AppDetailsContainer app={app} />);

      // Act
      const startButton = screen.getByRole('button', { name: 'Start' });
      startButton.click();

      // Assert
      await waitFor(() => {
        expect(screen.getByText(error)).toBeInTheDocument();
      });
    });
  });

  describe('Test: Stop app', () => {
    it('should display toast success when stop success', async () => {
      // Arrange
      const app = createAppEntity({ status: 'running' });
      server.use(getTRPCMock({ path: ['app', 'stopApp'], type: 'mutation', response: app }));
      render(<AppDetailsContainer app={app} />);
      const openModalButton = screen.getByRole('button', { name: 'Stop' });
      fireEvent.click(openModalButton);

      // Act
      const modalStopButton = screen.getByRole('button', { name: 'Stop' });
      modalStopButton.click();

      // Assert
      await waitFor(() => {
        expect(screen.getByText('App stopped successfully')).toBeInTheDocument();
      });
    });

    it('should display a toast error when stop mutation fails', async () => {
      // Arrange
      const error = faker.lorem.sentence();
      server.use(getTRPCMockError({ path: ['app', 'stopApp'], type: 'mutation', message: error }));
      const app = createAppEntity({ status: 'running' });
      render(<AppDetailsContainer app={app} />);
      const openModalButton = screen.getByRole('button', { name: 'Stop' });
      fireEvent.click(openModalButton);

      // Act
      const modalStopButton = screen.getByRole('button', { name: 'Stop' });
      modalStopButton.click();

      // Assert
      await waitFor(() => {
        expect(screen.getByText(error)).toBeInTheDocument();
      });
    });
  });

  describe('Test: Update app config', () => {
    it('should display toast success when update config success', async () => {
      // Arrange
      const app = createAppEntity({ status: 'running', overridesInfo: { exposable: true } });
      server.use(getTRPCMock({ path: ['app', 'updateAppConfig'], type: 'mutation', response: app }));
      render(<AppDetailsContainer app={app} />);
      const openModalButton = screen.getByRole('button', { name: 'Settings' });
      fireEvent.click(openModalButton);

      // Act
      const configButton = screen.getByRole('button', { name: 'Update' });
      configButton.click();

      // Assert
      await waitFor(() => {
        expect(screen.getByText('App config updated successfully. Restart the app to apply the changes')).toBeInTheDocument();
      });
    });

    it('should display a toast error when update config mutation fails', async () => {
      // Arrange
      const error = faker.lorem.sentence();
      server.use(getTRPCMockError({ path: ['app', 'updateAppConfig'], type: 'mutation', message: error }));
      const app = createAppEntity({ status: 'running', overridesInfo: { exposable: true } });
      render(<AppDetailsContainer app={app} />);
      const openModalButton = screen.getByRole('button', { name: 'Settings' });
      fireEvent.click(openModalButton);

      // Act
      const configButton = screen.getByRole('button', { name: 'Update' });
      configButton.click();

      // Assert
      await waitFor(() => {
        expect(screen.getByText(error)).toBeInTheDocument();
      });
    });
  });
});
