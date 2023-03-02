import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../../../../../tests/test-utils';
import { ResetPasswordForm } from './ResetPasswordForm';

describe('ResetPasswordForm', () => {
  it('should render the component', () => {
    render(<ResetPasswordForm onSubmit={jest.fn()} onCancel={jest.fn()} loading={false} />);
    expect(screen.getByText('Reset password')).toBeInTheDocument();
    expect(screen.getByText('Cancel password change request')).toBeInTheDocument();
  });

  it('should display an error if the password is too short', async () => {
    // Arrange
    render(<ResetPasswordForm onSubmit={jest.fn()} onCancel={jest.fn()} loading={false} />);

    // Act
    fireEvent.input(screen.getByLabelText('Password'), { target: { value: '123' } });
    fireEvent.input(screen.getByLabelText('Confirm password'), { target: { value: '12345678' } });
    fireEvent.click(screen.getByText('Reset password'));

    // Assert
    await waitFor(() => expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument());
  });

  it('should display an error if the passwords do not match', async () => {
    // Arrange
    render(<ResetPasswordForm onSubmit={jest.fn()} onCancel={jest.fn()} loading={false} />);

    // Act
    fireEvent.input(screen.getByLabelText('Password'), { target: { value: '12345678' } });
    fireEvent.input(screen.getByLabelText('Confirm password'), { target: { value: '123456789' } });
    fireEvent.click(screen.getByText('Reset password'));

    // Assert
    await waitFor(() => expect(screen.getByText('Passwords do not match')).toBeInTheDocument());
  });

  it('should call the onSubmit function when the form is submitted', async () => {
    // Arrange
    const onSubmit = jest.fn();
    render(<ResetPasswordForm onSubmit={onSubmit} onCancel={jest.fn()} loading={false} />);

    // Act
    fireEvent.input(screen.getByLabelText('Password'), { target: { value: '12345678' } });
    fireEvent.input(screen.getByLabelText('Confirm password'), { target: { value: '12345678' } });
    fireEvent.click(screen.getByText('Reset password'));

    // Assert
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('should call the onCancel function when the cancel button is clicked', async () => {
    // Arrange
    const onCancel = jest.fn();
    render(<ResetPasswordForm onSubmit={jest.fn()} onCancel={onCancel} loading={false} />);

    // Act
    fireEvent.click(screen.getByText('Cancel password change request'));

    // Assert
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });
});
