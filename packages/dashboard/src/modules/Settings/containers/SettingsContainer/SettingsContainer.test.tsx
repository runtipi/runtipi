import { faker } from '@faker-js/faker';
import { graphql } from 'msw';
import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '../../../../../tests/test-utils';
import { server } from '../../../../mocks/server';
import { useToastStore } from '../../../../state/toastStore';
import { SettingsContainer } from './SettingsContainer';

describe('Test: SettingsContainer', () => {
  it('renders without crashing', () => {
    const currentVersion = faker.system.semver();
    render(<SettingsContainer currentVersion={currentVersion} latestVersion={currentVersion} />);

    expect(screen.getByText('Tipi settings')).toBeInTheDocument();
    expect(screen.getByText('Already up to date')).toBeInTheDocument();
  });

  it('should make update button disable if current version is equal to latest version', () => {
    const currentVersion = faker.system.semver();
    render(<SettingsContainer currentVersion={currentVersion} latestVersion={currentVersion} />);

    expect(screen.getByText('Already up to date')).toBeDisabled();
  });

  it('should make update button disabled if current version is greater than latest version', () => {
    const currentVersion = '1.0.0';
    const latestVersion = '0.0.1';
    render(<SettingsContainer currentVersion={currentVersion} latestVersion={latestVersion} />);

    expect(screen.getByText('Already up to date')).toBeDisabled();
  });

  it('should display update button if current version is less than latest version', () => {
    const currentVersion = '0.0.1';
    const latestVersion = '1.0.0';

    render(<SettingsContainer currentVersion={currentVersion} latestVersion={latestVersion} />);
    expect(screen.getByText(`Update to ${latestVersion}`)).toBeInTheDocument();
    expect(screen.getByText(`Update to ${latestVersion}`)).not.toBeDisabled();
  });

  it('should call update mutation when update button is clicked', async () => {
    // Arrange

    localStorage.setItem('token', 'token');
    const currentVersion = '0.0.1';
    const latestVersion = '1.0.0';
    const updateFn = jest.fn();
    server.use(
      graphql.mutation('Update', async (req, res, ctx) => {
        updateFn();
        return res(ctx.data({ update: true }));
      }),
    );
    render(<SettingsContainer currentVersion={currentVersion} latestVersion={latestVersion} />);

    // Act
    act(() => screen.getByText(`Update to ${latestVersion}`).click());

    fireEvent.click(screen.getByText('Update'));
    waitFor(() => expect(updateFn).toHaveBeenCalled());
    // eslint-disable-next-line no-promise-executor-return
    await act(() => new Promise((resolve) => setTimeout(resolve, 1500)));

    // Assert
    const token = localStorage.getItem('token');
    expect(token).toBe(null);
  });

  it('should display error toast if update mutation fails', async () => {
    // Arrange
    const { result, unmount } = renderHook(() => useToastStore());
    const currentVersion = '0.0.1';
    const latestVersion = '1.0.0';
    const errorMessage = 'My error';
    server.use(graphql.mutation('Update', async (req, res, ctx) => res(ctx.errors([{ message: errorMessage }]))));
    render(<SettingsContainer currentVersion={currentVersion} latestVersion={latestVersion} />);

    // Act
    act(() => screen.getByText(`Update to ${latestVersion}`).click());
    fireEvent.click(screen.getByText('Update'));

    // Assert
    await waitFor(() => expect(result.current.toasts[0].description).toBe(errorMessage));
    unmount();
  });

  it('should call restart mutation when restart button is clicked', async () => {
    // Arrange
    const restartFn = jest.fn();
    server.use(
      graphql.mutation('Restart', async (req, res, ctx) => {
        restartFn();
        return res(ctx.data({ restart: true }));
      }),
    );
    render(<SettingsContainer currentVersion="1.0.0" latestVersion="1.0.0" />);

    // Act
    fireEvent.click(screen.getByTestId('settings-modal-restart-button'));
    waitFor(() => expect(restartFn).toHaveBeenCalled());
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Assert
    const token = localStorage.getItem('token');
    expect(token).toBe(null);
  });

  it('should display error toast if restart mutation fails', async () => {
    // Arrange
    const { result } = renderHook(() => useToastStore());
    const errorMessage = 'Update error';
    server.use(graphql.mutation('Restart', async (req, res, ctx) => res(ctx.errors([{ message: errorMessage }]))));
    render(<SettingsContainer currentVersion="1.0.0" latestVersion="1.0.0" />);
    // Act
    fireEvent.click(screen.getByTestId('settings-modal-restart-button'));

    // Assert
    await waitFor(() => expect(result.current.toasts[0].description).toBe(errorMessage));
  });
});
