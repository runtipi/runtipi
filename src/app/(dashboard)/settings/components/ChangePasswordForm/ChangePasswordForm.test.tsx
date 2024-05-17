import React from 'react';
import { faker } from '@faker-js/faker';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../../../../../tests/test-utils';
import { ChangePasswordForm } from './ChangePasswordForm';

describe('<ChangePasswordForm />', () => {
  it('should show error in the form if passwords do not match', async () => {
    // arrange
    render(<ChangePasswordForm />);
    const currentPasswordInput = screen.getByRole('textbox', { name: 'currentPassword' });
    const newPasswordInput = screen.getByRole('textbox', { name: 'newPassword' });
    const confirmPasswordInput = screen.getByRole('textbox', { name: 'newPasswordConfirm' });

    // act
    fireEvent.change(currentPasswordInput, { target: { value: 'test' } });
    fireEvent.change(newPasswordInput, { target: { value: faker.string.alphanumeric(8) } });
    fireEvent.change(confirmPasswordInput, { target: { value: faker.string.alphanumeric(8) } });
    const submitButton = screen.getByRole('button', { name: /Change password/i });
    submitButton.click();

    // assert
    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
  });
});
