import React from 'react';
import { server } from '@/client/mocks/server';
import { getTRPCMockError } from '@/client/mocks/getTrpcMock';
import { useToastStore } from '../../../../state/toastStore';
import { SettingsContainer } from './SettingsContainer';
import { fireEvent, render, renderHook, screen, waitFor } from '../../../../../../tests/test-utils';

describe('Test: SettingsContainer', () => {
  it('should render without error', () => {
    render(<SettingsContainer />);

    expect(screen.getByText('General settings')).toBeInTheDocument();
  });

  it('should show toast if updateSettings mutation fails', async () => {
    // arrange
    const { result } = renderHook(() => useToastStore());
    server.use(getTRPCMockError({ path: ['system', 'updateSettings'], type: 'mutation', status: 500, message: 'Something went wrong' }));
    render(<SettingsContainer />);
    const submitButton = screen.getByRole('button', { name: 'Save' });

    await waitFor(() => {
      expect(screen.getByDisplayValue('1.1.1.1')).toBeInTheDocument();
    });

    // act
    fireEvent.click(submitButton);

    // assert
    await waitFor(() => {
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].status).toEqual('error');
      expect(result.current.toasts[0].title).toEqual('Error saving settings');
    });
  });

  it('should put zod errors in the fields', async () => {
    // arrange
    server.use(getTRPCMockError({ path: ['system', 'updateSettings'], zodError: { dnsIp: 'invalid ip' }, type: 'mutation', status: 500, message: 'Something went wrong' }));
    render(<SettingsContainer />);
    const submitButton = screen.getByRole('button', { name: 'Save' });

    // act
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('invalid ip')).toBeInTheDocument();
    });
  });

  it('should show toast if updateSettings mutation succeeds', async () => {
    // arrange
    const { result } = renderHook(() => useToastStore());
    render(<SettingsContainer />);
    const submitButton = screen.getByRole('button', { name: 'Save' });

    // act
    fireEvent.click(submitButton);

    // assert
    await waitFor(() => {
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].status).toEqual('success');
    });
  });
});
