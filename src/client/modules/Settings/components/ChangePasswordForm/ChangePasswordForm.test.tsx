import React from 'react';
import { server } from '@/client/mocks/server';
import { getTRPCMock, getTRPCMockError } from '@/client/mocks/getTrpcMock';
import { useToastStore } from '@/client/state/toastStore';
import { renderHook } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import { render, screen, waitFor, fireEvent } from '../../../../../../tests/test-utils';
import { ChangePasswordForm } from './ChangePasswordForm';

describe('<ChangePasswordForm />', () => {
  it('should show success toast upon password change', async () => {
    // arrange
    const { result } = renderHook(() => useToastStore());
    server.use(getTRPCMock({ path: ['auth', 'changePassword'], type: 'mutation', response: true }));
    render(<ChangePasswordForm />);
    const currentPasswordInput = screen.getByRole('textbox', { name: 'currentPassword' });
    const newPasswordInput = screen.getByRole('textbox', { name: 'newPassword' });
    const confirmPasswordInput = screen.getByRole('textbox', { name: 'newPasswordConfirm' });
    const newPassword = faker.random.alphaNumeric(8);

    // act
    fireEvent.change(currentPasswordInput, { target: { value: 'test' } });
    fireEvent.change(newPasswordInput, { target: { value: newPassword } });
    fireEvent.change(confirmPasswordInput, { target: { value: newPassword } });
    const submitButton = screen.getByRole('button', { name: /Change password/i });
    submitButton.click();

    // assert
    await waitFor(() => {
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]?.status).toEqual('success');
      expect(result.current.toasts[0]?.description).toEqual('Password successfully changed');
    });
  });

  it('should show error toast if change password failed', async () => {
    // arrange
    const { result } = renderHook(() => useToastStore());
    server.use(getTRPCMockError({ path: ['auth', 'changePassword'], type: 'mutation', message: 'Invalid password' }));
    render(<ChangePasswordForm />);
    const currentPasswordInput = screen.getByRole('textbox', { name: 'currentPassword' });
    const newPasswordInput = screen.getByRole('textbox', { name: 'newPassword' });
    const confirmPasswordInput = screen.getByRole('textbox', { name: 'newPasswordConfirm' });
    const newPassword = faker.random.alphaNumeric(8);

    // act
    fireEvent.change(currentPasswordInput, { target: { value: faker.random.alphaNumeric(8) } });
    fireEvent.change(newPasswordInput, { target: { value: newPassword } });
    fireEvent.change(confirmPasswordInput, { target: { value: newPassword } });
    const submitButton = screen.getByRole('button', { name: /Change password/i });
    submitButton.click();

    // assert
    await waitFor(() => {
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]?.status).toEqual('error');
      expect(result.current.toasts[0]?.title).toEqual('Error');
      expect(result.current.toasts[0]?.description).toEqual('Invalid password');
    });
  });

  it('should show error in the form if passwords do not match', async () => {
    // arrange
    render(<ChangePasswordForm />);
    const currentPasswordInput = screen.getByRole('textbox', { name: 'currentPassword' });
    const newPasswordInput = screen.getByRole('textbox', { name: 'newPassword' });
    const confirmPasswordInput = screen.getByRole('textbox', { name: 'newPasswordConfirm' });

    // act
    fireEvent.change(currentPasswordInput, { target: { value: 'test' } });
    fireEvent.change(newPasswordInput, { target: { value: faker.random.alphaNumeric(8) } });
    fireEvent.change(confirmPasswordInput, { target: { value: faker.random.alphaNumeric(8) } });
    const submitButton = screen.getByRole('button', { name: /Change password/i });
    submitButton.click();

    // assert
    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
  });
});
