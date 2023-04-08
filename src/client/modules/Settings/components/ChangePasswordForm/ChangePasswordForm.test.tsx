import React from 'react';
import { server } from '@/client/mocks/server';
import { getTRPCMock, getTRPCMockError } from '@/client/mocks/getTrpcMock';
import { faker } from '@faker-js/faker';
import { render, screen, waitFor, fireEvent } from '../../../../../../tests/test-utils';
import { ChangePasswordForm } from './ChangePasswordForm';

describe('<ChangePasswordForm />', () => {
  it('should show success toast upon password change', async () => {
    // arrange
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
      expect(screen.getByText('Password successfully changed')).toBeInTheDocument();
    });
  });

  it('should show error toast if change password failed', async () => {
    // arrange
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
      expect(screen.getByText(/Invalid password/)).toBeInTheDocument();
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
