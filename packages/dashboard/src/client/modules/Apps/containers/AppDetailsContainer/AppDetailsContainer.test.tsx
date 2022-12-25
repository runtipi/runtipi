import { graphql } from 'msw';
import React from 'react';
import { fireEvent, render, renderHook, screen, waitFor } from '../../../../../../tests/test-utils';
import { AppStatusEnum } from '../../../../generated/graphql';
import { createAppEntity } from '../../../../mocks/fixtures/app.fixtures';
import { server } from '../../../../mocks/server';
import { useToastStore } from '../../../../state/toastStore';
import { AppDetailsContainer } from './AppDetailsContainer';

describe('Test: AppDetailsContainer', () => {
  describe('Test: UI', () => {
    it('should render', async () => {
      // Arrange
      const app = createAppEntity({});
      render(<AppDetailsContainer app={app} info={app.info} />);

      // Assert
      expect(screen.getByText(app.info.short_desc)).toBeInTheDocument();
    });

    it('should display update button when update is available', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { updateInfo: { current: 2, latest: 3 } } });
      render(<AppDetailsContainer app={app} info={app.info} />);

      // Assert
      expect(screen.getByTestId('action-button-update')).toBeInTheDocument();
    });

    it('should display install button when app is not installed', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { status: AppStatusEnum.Missing } });

      render(<AppDetailsContainer app={app} info={app.info} />);

      // Assert
      expect(screen.getByTestId('action-button-install')).toBeInTheDocument();
    });

    it('should display uninstall and start button when app is stopped', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { status: AppStatusEnum.Stopped } });

      render(<AppDetailsContainer app={app} info={app.info} />);

      // Assert
      expect(screen.getByTestId('action-button-remove')).toBeInTheDocument();
      expect(screen.getByTestId('action-button-start')).toBeInTheDocument();
    });

    it('should display stop, open and settings buttons when app is running', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { status: AppStatusEnum.Running } });
      render(<AppDetailsContainer app={app} info={app.info} />);

      // Assert
      expect(screen.getByTestId('action-button-stop')).toBeInTheDocument();
      expect(screen.getByTestId('action-button-open')).toBeInTheDocument();
      expect(screen.getByTestId('action-button-settings')).toBeInTheDocument();
    });

    it('should not display update button when update is not available', async () => {
      // Arrange
      const app = createAppEntity({ overrides: { updateInfo: { current: 3, latest: 3 } } });
      render(<AppDetailsContainer app={app} info={app.info} />);

      // Assert
      expect(screen.queryByTestId('action-button-update')).not.toBeInTheDocument();
    });

    it('should not display open button when app has no_gui set to true', async () => {
      // Arrange
      const app = createAppEntity({ overridesInfo: { no_gui: true } });
      render(<AppDetailsContainer app={app} info={app.info} />);

      // Assert
      expect(screen.queryByTestId('action-button-open')).not.toBeInTheDocument();
    });
  });

  describe('Test: Open app', () => {
    it('should call window.open with the correct url when open button is clicked', async () => {
      // Arrange
      const app = createAppEntity({});
      const spy = jest.spyOn(window, 'open').mockImplementation(() => null);
      render(<AppDetailsContainer app={app} info={app.info} />);

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
      render(<AppDetailsContainer app={app} info={app.info} />);

      // Act
      const openButton = screen.getByTestId('action-button-open');
      openButton.click();

      // Assert
      expect(spy).toHaveBeenCalledWith(`https://localhost:${app.info.port}`, '_blank', 'noreferrer');
    });
  });

  describe('Test: Install app', () => {
    const installFn = jest.fn();
    const fakeInstallHandler = graphql.mutation('InstallApp', (req, res, ctx) => {
      installFn(req.variables);
      return res(ctx.data({ installApp: { id: 'id', status: '', __typename: '' } }));
    });

    it('should call install mutation when install form is submitted', async () => {
      // Arrange
      server.use(fakeInstallHandler);
      const app = createAppEntity({ overrides: { status: AppStatusEnum.Missing } });
      render(<AppDetailsContainer app={app} info={app.info} />);

      // Act
      const installForm = screen.getByTestId('install-form');
      fireEvent.submit(installForm);

      await waitFor(() => {
        expect(installFn).toHaveBeenCalledWith({
          input: { id: app.id, form: {}, exposed: false, domain: '' },
        });
      });
    });

    it('should display a toast error when install mutation fails', async () => {
      // Arrange
      const { result } = renderHook(() => useToastStore());
      server.use(graphql.mutation('InstallApp', (req, res, ctx) => res(ctx.errors([{ message: 'my big error' }]))));
      const app = createAppEntity({ overrides: { status: AppStatusEnum.Missing } });
      render(<AppDetailsContainer app={app} info={app.info} />);

      // Act
      const installForm = screen.getByTestId('install-form');
      fireEvent.submit(installForm);

      await waitFor(() => {
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].description).toEqual('my big error');
        expect(result.current.toasts[0].status).toEqual('error');
      });
    });
  });
});
