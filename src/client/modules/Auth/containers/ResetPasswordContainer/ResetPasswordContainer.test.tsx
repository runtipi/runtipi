import React from 'react';
import { fireEvent, render, screen, waitFor, renderHook } from '../../../../../../tests/test-utils';
import { getTRPCMock, getTRPCMockError } from '../../../../mocks/getTrpcMock';
import { server } from '../../../../mocks/server';
import { useToastStore } from '../../../../state/toastStore';
import { ResetPasswordContainer } from './ResetPasswordContainer';

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

describe('ResetPasswordContainer', () => {
  it('should render the component', () => {
    render(<ResetPasswordContainer isRequested={false} />);
    expect(screen.getByText('Reset your password')).toBeInTheDocument();
    expect(screen.getByText('Run this command on your server and then refresh this page')).toBeInTheDocument();
    expect(screen.getByText('./scripts/reset-password.sh')).toBeInTheDocument();
  });

  it('should render the password reset success message', async () => {
    // Arrange
    const email = 'test@test.com';

    render(<ResetPasswordContainer isRequested />);
    const resetPasswordForm = screen.getByRole('button', { name: 'Reset password' });

    const newPassword = 'new_password';
    const response = { email };
    server.use(getTRPCMock({ path: ['auth', 'resetPassword'], type: 'mutation', response, delay: 100 }));

    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm password');

    // Act
    fireEvent.change(passwordInput, { target: { value: newPassword } });
    fireEvent.change(confirmPasswordInput, { target: { value: newPassword } });
    fireEvent.click(resetPasswordForm);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Password reset')).toBeInTheDocument();
      expect(screen.getByText(`Your password has been reset. You can now login with your new password. And your email ${email}`)).toBeInTheDocument();
      expect(screen.getByText('Back to login')).toBeInTheDocument();
    });
  });

  it('should show error toast if reset password mutation fails', async () => {
    // Arrange
    const { result, unmount } = renderHook(() => useToastStore());
    render(<ResetPasswordContainer isRequested />);
    const resetPasswordForm = screen.getByRole('button', { name: 'Reset password' });
    fireEvent.click(resetPasswordForm);

    const newPassword = 'new_password';
    const error = { message: 'Something went wrong' };
    server.use(getTRPCMockError({ path: ['auth', 'resetPassword'], type: 'mutation', message: error.message }));

    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm password');

    // Act
    fireEvent.change(passwordInput, { target: { value: newPassword } });
    fireEvent.change(confirmPasswordInput, { target: { value: newPassword } });
    fireEvent.click(resetPasswordForm);

    // Assert
    await waitFor(() => {
      expect(result.current.toasts[0].description).toBe(error.message);
    });

    unmount();
  });

  it('should call the cancel request mutation when cancel button is clicked', async () => {
    // Arrange
    const { result, unmount } = renderHook(() => useToastStore());
    render(<ResetPasswordContainer isRequested />);
    server.use(getTRPCMock({ path: ['auth', 'cancelPasswordChangeRequest'], type: 'mutation', response: true }));

    const cancelRequestForm = screen.getByRole('button', { name: 'Cancel password change request' });

    // Act
    fireEvent.click(cancelRequestForm);

    // Assert
    await waitFor(() => {
      expect(result.current.toasts[0].title).toBe('Password change request cancelled');
    });

    unmount();
  });

  it('should redirect to login page when Back to login button is clicked', async () => {
    // Arrange
    render(<ResetPasswordContainer isRequested />);
    server.use(getTRPCMock({ path: ['auth', 'resetPassword'], type: 'mutation', response: { email: 'goofy@test.com' } }));
    const resetPasswordForm = screen.getByRole('button', { name: 'Reset password' });
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm password');

    const newPassword = 'new_password';
    fireEvent.change(passwordInput, { target: { value: newPassword } });
    fireEvent.change(confirmPasswordInput, { target: { value: newPassword } });
    fireEvent.click(resetPasswordForm);

    await waitFor(() => {
      expect(screen.getByText('Back to login')).toBeInTheDocument();
    });

    // Act
    const backToLoginButton = screen.getByRole('button', { name: 'Back to login' });
    fireEvent.click(backToLoginButton);

    // Assert
    await waitFor(() => {
      expect(pushFn).toHaveBeenCalledWith('/login');
    });
  });
});
