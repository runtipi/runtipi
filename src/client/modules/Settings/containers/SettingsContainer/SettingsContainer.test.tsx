import { faker } from '@faker-js/faker';
import React from 'react';
import { render, screen, waitFor, act, fireEvent, renderHook } from '../../../../../../tests/test-utils';
import { getTRPCMockError } from '../../../../mocks/getTrpcMock';
import { server } from '../../../../mocks/server';
import { useToastStore } from '../../../../state/toastStore';
import { SettingsContainer } from './SettingsContainer';

describe('Test: SettingsContainer', () => {
  describe('UI', () => {
    it('renders without crashing', () => {
      const current = faker.system.semver();
      render(<SettingsContainer data={{ current }} />);

      expect(screen.getByText('Tipi settings')).toBeInTheDocument();
      expect(screen.getByText('Already up to date')).toBeInTheDocument();
    });

    it('should make update button disable if current version is equal to latest version', () => {
      const current = faker.system.semver();
      render(<SettingsContainer data={{ current, latest: current }} />);

      expect(screen.getByText('Already up to date')).toBeDisabled();
    });

    it('should make update button disabled if current version is greater than latest version', () => {
      const current = '1.0.0';
      const latest = '0.0.1';
      render(<SettingsContainer data={{ current, latest }} />);

      expect(screen.getByText('Already up to date')).toBeDisabled();
    });

    it('should display update button if current version is less than latest version', () => {
      const current = '0.0.1';
      const latest = '1.0.0';

      render(<SettingsContainer data={{ current, latest }} />);
      expect(screen.getByText(`Update to ${latest}`)).toBeInTheDocument();
      expect(screen.getByText(`Update to ${latest}`)).not.toBeDisabled();
    });
  });

  describe('Update', () => {
    it('should remove token from local storage on success', async () => {
      const current = '0.0.1';
      const latest = faker.system.semver();
      const removeItem = jest.spyOn(localStorage, 'removeItem');
      render(<SettingsContainer data={{ current, latest }} />);

      const updateButton = screen.getByText('Update');
      act(() => {
        fireEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(removeItem).toBeCalledWith('token');
      });
    });

    it('should display error toast on error', async () => {
      const { result, unmount } = renderHook(() => useToastStore());
      const current = '0.0.1';
      const latest = faker.system.semver();
      const error = faker.lorem.sentence();
      server.use(getTRPCMockError({ path: ['system', 'update'], type: 'mutation', message: error }));
      render(<SettingsContainer data={{ current, latest }} />);

      const updateButton = screen.getByText('Update');
      act(() => {
        fireEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(result.current.toasts[0].description).toBe(error);
      });

      unmount();
    });
  });

  describe('Restart', () => {
    it('should remove token from local storage on success', async () => {
      const current = faker.system.semver();
      const removeItem = jest.spyOn(localStorage, 'removeItem');

      render(<SettingsContainer data={{ current }} />);
      const restartButton = screen.getByTestId('settings-modal-restart-button');
      act(() => {
        fireEvent.click(restartButton);
      });

      await waitFor(() => {
        expect(removeItem).toBeCalledWith('token');
      });
    });

    it('should display error toast on error', async () => {
      const { result, unmount } = renderHook(() => useToastStore());
      const current = faker.system.semver();
      const error = faker.lorem.sentence();
      server.use(getTRPCMockError({ path: ['system', 'restart'], type: 'mutation', message: error }));
      render(<SettingsContainer data={{ current }} />);

      const restartButton = screen.getByTestId('settings-modal-restart-button');
      act(() => {
        fireEvent.click(restartButton);
      });

      await waitFor(() => {
        expect(result.current.toasts[0].description).toBe(error);
      });

      unmount();
    });
  });
});
