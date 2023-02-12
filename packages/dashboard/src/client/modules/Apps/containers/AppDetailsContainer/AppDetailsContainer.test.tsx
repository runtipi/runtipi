import React from 'react';
import { fireEvent, render, renderHook, screen, waitFor } from '../../../../../../tests/test-utils';
import { createAppEntity } from '../../../../mocks/fixtures/app.fixtures';
import { getTRPCMock, getTRPCMockError } from '../../../../mocks/getTrpcMock';
import { server } from '../../../../mocks/server';
import { useToastStore } from '../../../../state/toastStore';
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
      expect(screen.getByTestId('action-button-update')).toBeInTheDocument();
    });

    it('should display install button when app is not installed', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { status: 'missing' } });

      render(<AppDetailsContainer app={app} />);

      // Assert
      expect(screen.getByTestId('action-button-install')).toBeInTheDocument();
    });

    it('should display uninstall and start button when app is stopped', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { status: 'stopped' } });

      render(<AppDetailsContainer app={app} />);

      // Assert
      expect(screen.getByTestId('action-button-remove')).toBeInTheDocument();
      expect(screen.getByTestId('action-button-start')).toBeInTheDocument();
    });

    it('should display stop, open and settings buttons when app is running', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { status: 'running' } });
      render(<AppDetailsContainer app={app} />);

      // Assert
      expect(screen.getByTestId('action-button-stop')).toBeInTheDocument();
      expect(screen.getByTestId('action-button-open')).toBeInTheDocument();
      expect(screen.getByTestId('action-button-settings')).toBeInTheDocument();
    });

    it('should not display update button when update is not available', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { version: 3 }, overridesInfo: { tipi_version: 3 } });
      render(<AppDetailsContainer app={app} />);

      // Assert
      expect(screen.queryByTestId('action-button-update')).not.toBeInTheDocument();
    });

    it('should not display open button when app has no_gui set to true', async () => {
      // Arrange
      const app = createAppEntity({ overridesInfo: { no_gui: true } });
      render(<AppDetailsContainer app={app} />);

      // Assert
      expect(screen.queryByTestId('action-button-open')).not.toBeInTheDocument();
    });
  });

  describe('Test: Open app', () => {
    it('should call window.open with the correct url when open button is clicked', async () => {
      // Arrange
      const app = createAppEntity({});
      const spy = jest.spyOn(window, 'open').mockImplementation(() => null);
      render(<AppDetailsContainer app={app} />);

      // Act
      const openButton = screen.getByTestId('action-button-open');
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
      const openButton = screen.getByTestId('action-button-open');
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
      const { result } = renderHook(() => useToastStore());
      render(<AppDetailsContainer app={app} />);

      // Act
      const installForm = screen.getByTestId('install-form');
      fireEvent.submit(installForm);

      await waitFor(() => {
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].status).toEqual('success');
        expect(result.current.toasts[0].title).toEqual('App installed successfully');
      });
    });

    it('should display a toast error when install mutation fails', async () => {
      // Arrange
      const { result } = renderHook(() => useToastStore());
      server.use(
        getTRPCMockError({
          path: ['app', 'installApp'],
          type: 'mutation',
          message: 'my big error',
        }),
      );

      const app = createAppEntity({ overrides: { status: 'missing' } });
      render(<AppDetailsContainer app={app} />);

      // Act
      const installForm = screen.getByTestId('install-form');
      fireEvent.submit(installForm);

      await waitFor(() => {
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].description).toEqual('my big error');
        expect(result.current.toasts[0].status).toEqual('error');
      });
    });

    // Skipping because trpc.useContext is not working in tests
    it.skip('should put the app in installing state when install mutation is called', async () => {
      // Arrange
      const { result } = renderHook(() => useToastStore());
      const app = createAppEntity({ overrides: { status: 'missing' } });
      server.use(getTRPCMock({ path: ['app', 'installApp'], type: 'mutation', response: app, delay: 100 }));
      render(<AppDetailsContainer app={app} />);

      // Act
      const installForm = screen.getByTestId('install-form');
      fireEvent.submit(installForm);

      await waitFor(() => {
        expect(screen.getByText('installing')).toBeInTheDocument();
        expect(result.current.toasts).toHaveLength(1);
      });
    });
  });

  describe('Test: Update app', () => {
    it('should display toast success when update success', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { version: 2, latestVersion: 3 } });
      server.use(getTRPCMock({ path: ['app', 'updateApp'], type: 'mutation', response: app }));
      const { result } = renderHook(() => useToastStore());
      render(<AppDetailsContainer app={app} />);

      // Act
      const updateButton = screen.getByTestId('action-button-update');
      updateButton.click();
      const modalUpdateButton = screen.getByTestId('modal-update-button');
      modalUpdateButton.click();

      await waitFor(() => {
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].status).toEqual('success');
        expect(result.current.toasts[0].title).toEqual('App updated successfully');
      });
    });

    it('should display a toast error when update mutation fails', async () => {
      // Arrange
      const { result } = renderHook(() => useToastStore());
      server.use(getTRPCMockError({ path: ['app', 'updateApp'], type: 'mutation', message: 'my big error' }));
      const app = createAppEntity({ overrides: { version: 2, latestVersion: 3 }, overridesInfo: { tipi_version: 3 } });
      render(<AppDetailsContainer app={app} />);

      // Act
      const updateButton = screen.getByTestId('action-button-update');
      updateButton.click();
      const modalUpdateButton = screen.getByTestId('modal-update-button');
      modalUpdateButton.click();

      // Assert
      await waitFor(() => {
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].description).toEqual('my big error');
        expect(result.current.toasts[0].status).toEqual('error');
      });
    });

    // Skipping because trpc.useContext is not working in tests
    it.skip('should put the app in updating state when update mutation is called', async () => {
      // Arrange
      const { result } = renderHook(() => useToastStore());
      const app = createAppEntity({ overrides: { version: 2 }, overridesInfo: { tipi_version: 3 } });
      server.use(getTRPCMock({ path: ['app', 'updateApp'], type: 'mutation', response: app, delay: 100 }));
      render(<AppDetailsContainer app={app} />);

      // Act
      const updateButton = screen.getByTestId('action-button-update');
      updateButton.click();
      const modalUpdateButton = screen.getByTestId('modal-update-button');
      modalUpdateButton.click();

      await waitFor(() => {
        expect(screen.getByText('updating')).toBeInTheDocument();
        expect(result.current.toasts).toHaveLength(1);
      });
    });
  });

  describe('Test: Uninstall app', () => {
    it('should display toast success when uninstall success', async () => {
      // Arrange
      const app = createAppEntity({ status: 'stopped' });
      server.use(getTRPCMock({ path: ['app', 'uninstallApp'], type: 'mutation', response: { id: app.id, config: {}, status: 'missing' } }));
      const { result } = renderHook(() => useToastStore());
      render(<AppDetailsContainer app={app} />);

      // Act
      const uninstallButton = screen.getByTestId('action-button-remove');
      uninstallButton.click();
      const modalUninstallButton = screen.getByText('Uninstall');
      modalUninstallButton.click();

      // Assert
      await waitFor(() => {
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].status).toEqual('success');
        expect(result.current.toasts[0].title).toEqual('App uninstalled successfully');
      });
    });

    it('should display a toast error when uninstall mutation fails', async () => {
      // Arrange
      const { result } = renderHook(() => useToastStore());
      server.use(getTRPCMockError({ path: ['app', 'uninstallApp'], type: 'mutation', message: 'my big error' }));
      const app = createAppEntity({ status: 'stopped' });
      render(<AppDetailsContainer app={app} />);

      // Act
      const uninstallButton = screen.getByTestId('action-button-remove');
      uninstallButton.click();
      const modalUninstallButton = screen.getByText('Uninstall');
      modalUninstallButton.click();

      // Assert
      await waitFor(() => {
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].description).toEqual('my big error');
        expect(result.current.toasts[0].status).toEqual('error');
      });
    });

    // Skipping because trpc.useContext is not working in tests
    it.skip('should put the app in uninstalling state when uninstall mutation is called', async () => {
      // Arrange
      const { result } = renderHook(() => useToastStore());
      const app = createAppEntity({ status: 'stopped' });
      server.use(getTRPCMock({ path: ['app', 'uninstallApp'], type: 'mutation', response: { id: app.id, config: {}, status: 'missing' }, delay: 100 }));
      render(<AppDetailsContainer app={app} />);

      // Act
      const uninstallButton = screen.getByTestId('action-button-remove');
      uninstallButton.click();
      const modalUninstallButton = screen.getByText('Uninstall');
      modalUninstallButton.click();

      await waitFor(() => {
        expect(screen.getByText('uninstalling')).toBeInTheDocument();
        expect(screen.queryByText('installing')).not.toBeInTheDocument();
        expect(result.current.toasts).toHaveLength(1);
      });
    });
  });

  describe('Test: Start app', () => {
    it('should display toast success when start success', async () => {
      // Arrange
      const app = createAppEntity({ status: 'stopped' });
      server.use(getTRPCMock({ path: ['app', 'startApp'], type: 'mutation', response: app }));
      const { result } = renderHook(() => useToastStore());
      render(<AppDetailsContainer app={app} />);

      // Act
      const startButton = screen.getByTestId('action-button-start');
      startButton.click();

      // Assert
      await waitFor(() => {
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].status).toEqual('success');
        expect(result.current.toasts[0].title).toEqual('App started successfully');
      });
    });

    it('should display a toast error when start mutation fails', async () => {
      // Arrange
      const { result } = renderHook(() => useToastStore());
      server.use(getTRPCMockError({ path: ['app', 'startApp'], type: 'mutation', message: 'my big error' }));
      const app = createAppEntity({ status: 'stopped' });
      render(<AppDetailsContainer app={app} />);

      // Act
      const startButton = screen.getByTestId('action-button-start');
      startButton.click();

      // Assert
      await waitFor(() => {
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].description).toEqual('my big error');
        expect(result.current.toasts[0].status).toEqual('error');
      });
    });

    // Skipping because trpc.useContext is not working in tests
    it.skip('should put the app in starting state when start mutation is called', async () => {
      // Arrange
      const { result } = renderHook(() => useToastStore());
      const app = createAppEntity({ status: 'stopped' });
      server.use(getTRPCMock({ path: ['app', 'startApp'], type: 'mutation', response: app, delay: 100 }));
      render(<AppDetailsContainer app={app} />);

      // Act
      const startButton = screen.getByTestId('action-button-start');
      startButton.click();

      await waitFor(() => {
        expect(screen.getByText('starting')).toBeInTheDocument();
        expect(result.current.toasts).toHaveLength(1);
      });
    });
  });

  describe('Test: Stop app', () => {
    it('should display toast success when stop success', async () => {
      // Arrange
      const app = createAppEntity({ status: 'running' });
      server.use(getTRPCMock({ path: ['app', 'stopApp'], type: 'mutation', response: app }));
      const { result } = renderHook(() => useToastStore());
      render(<AppDetailsContainer app={app} />);

      // Act
      const stopButton = screen.getByTestId('action-button-stop');
      stopButton.click();
      const modalStopButton = screen.getByTestId('modal-stop-button');
      modalStopButton.click();

      // Assert
      await waitFor(() => {
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].status).toEqual('success');
        expect(result.current.toasts[0].title).toEqual('App stopped successfully');
      });
    });

    it('should display a toast error when stop mutation fails', async () => {
      // Arrange
      const { result } = renderHook(() => useToastStore());
      server.use(getTRPCMockError({ path: ['app', 'stopApp'], type: 'mutation', message: 'my big error' }));
      const app = createAppEntity({ status: 'running' });
      render(<AppDetailsContainer app={app} />);

      // Act
      const stopButton = screen.getByTestId('action-button-stop');
      stopButton.click();
      const modalStopButton = screen.getByTestId('modal-stop-button');
      modalStopButton.click();

      // Assert
      await waitFor(() => {
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].description).toEqual('my big error');
        expect(result.current.toasts[0].status).toEqual('error');
      });
    });

    // Skipping because trpc.useContext is not working in tests
    it.skip('should put the app in stopping state when stop mutation is called', async () => {
      // Arrange
      const { result } = renderHook(() => useToastStore());
      const app = createAppEntity({ status: 'running' });
      server.use(getTRPCMock({ path: ['app', 'stopApp'], type: 'mutation', response: app }));
      render(<AppDetailsContainer app={app} />);

      // Act
      const stopButton = screen.getByTestId('action-button-stop');
      stopButton.click();
      const modalStopButton = screen.getByTestId('modal-stop-button');
      modalStopButton.click();

      await waitFor(() => {
        expect(screen.getByText('stopping')).toBeInTheDocument();
        expect(result.current.toasts).toHaveLength(1);
      });
    });
  });

  describe('Test: Update app config', () => {
    it('should display toast success when update config success', async () => {
      // Arrange
      const app = createAppEntity({ status: 'running', overridesInfo: { exposable: true } });
      server.use(getTRPCMock({ path: ['app', 'updateAppConfig'], type: 'mutation', response: app }));
      const { result } = renderHook(() => useToastStore());
      render(<AppDetailsContainer app={app} />);

      // Act
      const configButton = screen.getByTestId('action-button-settings');
      configButton.click();
      const modalConfigButton = screen.getAllByText('Update');
      modalConfigButton[1]?.click();

      // Assert
      await waitFor(() => {
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].status).toEqual('success');
        expect(result.current.toasts[0].title).toEqual('App config updated successfully. Restart the app to apply the changes');
      });
    });

    it('should display a toast error when update config mutation fails', async () => {
      // Arrange
      const { result } = renderHook(() => useToastStore());
      server.use(getTRPCMockError({ path: ['app', 'updateAppConfig'], type: 'mutation', message: 'my big error' }));
      const app = createAppEntity({ status: 'running', overridesInfo: { exposable: true } });
      render(<AppDetailsContainer app={app} />);

      // Act
      const configButton = screen.getByTestId('action-button-settings');
      configButton.click();
      const modalConfigButton = screen.getAllByText('Update');
      modalConfigButton[1]?.click();

      // Assert
      await waitFor(() => {
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].description).toEqual('my big error');
        expect(result.current.toasts[0].status).toEqual('error');
      });
    });
  });
});
