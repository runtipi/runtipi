import React from 'react';
import { act, render, renderHook, screen, waitFor } from '../../../../../tests/test-utils';
import { useSystemStore } from '../../../state/systemStore';
import { StatusProvider } from './StatusProvider';

const reloadFn = jest.fn();

jest.mock('next/router', () => {
  const actualRouter = jest.requireActual('next-router-mock');

  return {
    ...actualRouter,
    reload: () => reloadFn(),
  };
});

describe('Test: StatusProvider', () => {
  it("should render it's children when system is RUNNING", async () => {
    const { result, unmount } = renderHook(() => useSystemStore());
    act(() => {
      result.current.setStatus('RUNNING');
    });

    render(
      <StatusProvider>
        <div>system running</div>
      </StatusProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('system running')).toBeInTheDocument();
    });

    unmount();
  });

  it('should render StatusScreen when system is RESTARTING', async () => {
    const { result, unmount } = renderHook(() => useSystemStore());
    act(() => {
      result.current.setStatus('RESTARTING');
    });
    render(
      <StatusProvider>
        <div>system running</div>
      </StatusProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Your system is restarting...')).toBeInTheDocument();
    });

    unmount();
  });

  it('should render StatusScreen when system is UPDATING', async () => {
    const { result, unmount } = renderHook(() => useSystemStore());
    act(() => {
      result.current.setStatus('UPDATING');
    });

    render(
      <StatusProvider>
        <div>system running</div>
      </StatusProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Your system is updating...')).toBeInTheDocument();
    });

    unmount();
  });

  it('should reload the page when system is RUNNING after being something else than RUNNING', async () => {
    const { result, unmount } = renderHook(() => useSystemStore());
    act(() => {
      result.current.setStatus('UPDATING');
    });

    render(
      <StatusProvider>
        <div>system running</div>
      </StatusProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Your system is updating...')).toBeInTheDocument();
    });

    act(() => {
      result.current.setStatus('RUNNING');
    });
    await waitFor(() => {
      expect(reloadFn).toHaveBeenCalled();
    });
    unmount();
  });
});
