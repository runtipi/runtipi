import React from 'react';
import { act, render, renderHook, screen, waitFor } from '../../../../../tests/test-utils';
import { useToastStore } from '../../../state/toastStore';
import { ToastProvider } from './ToastProvider';

describe('Test: ToastProvider', () => {
  it("should render it's children", async () => {
    render(
      <ToastProvider>
        <div>children</div>
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('children')).toBeInTheDocument();
    });
  });

  it('should render Toasts', async () => {
    render(
      <ToastProvider>
        <div>children</div>
      </ToastProvider>,
    );
    const { result } = renderHook(() => useToastStore());

    act(() => {
      result.current.addToast({
        status: 'success',
        title: 'title',
        description: 'description',
        id: 'id',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('title')).toBeInTheDocument();
    });
  });

  it('should remove Toasts when the close button is clicked', async () => {
    render(
      <ToastProvider>
        <div>children</div>
      </ToastProvider>,
    );
    const { result } = renderHook(() => useToastStore());

    act(() => {
      result.current.addToast({
        status: 'success',
        title: 'title',
        description: 'description',
        id: 'id',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('title')).toBeInTheDocument();
    });

    act(() => {
      screen.getByTestId('toast-close-button').click();
    });

    await waitFor(() => {
      expect(screen.queryByText('title')).not.toBeInTheDocument();
    });
  });
});
