import { faker } from '@faker-js/faker';
import React from 'react';
import { fireEvent, render, renderHook, screen, waitFor } from '../../../../../../tests/test-utils';
import { getTRPCMock, getTRPCMockError } from '../../../../mocks/getTrpcMock';
import { server } from '../../../../mocks/server';
import { useToastStore } from '../../../../state/toastStore';
import { LoginContainer } from './LoginContainer';

describe('Test: LoginContainer', () => {
  it('should render without error', () => {
    // Arrange
    render(<LoginContainer />);

    // Assert
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('should have login button disabled if email and password are not provided', () => {
    // Arrange
    render(<LoginContainer />);
    const loginButton = screen.getByRole('button', { name: 'Login' });

    // Assert
    expect(loginButton).toBeDisabled();
  });

  it('should have login button enabled if email and password are provided', () => {
    // Arrange
    render(<LoginContainer />);
    const loginButton = screen.getByRole('button', { name: 'Login' });
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');

    // Act
    fireEvent.change(emailInput, { target: { value: faker.internet.email() } });
    fireEvent.change(passwordInput, { target: { value: faker.internet.password() } });

    // Assert
    expect(loginButton).toBeEnabled();
  });

  it('should add token in localStorage on submit', async () => {
    // Arrange
    const email = faker.internet.email();
    const password = faker.internet.password();
    const token = faker.datatype.uuid();
    server.use(getTRPCMock({ path: ['auth', 'login'], type: 'mutation', response: { token } }));
    render(<LoginContainer />);

    // Act
    const loginButton = screen.getByRole('button', { name: 'Login' });
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(emailInput, { target: { value: email } });
    fireEvent.change(passwordInput, { target: { value: password } });
    fireEvent.click(loginButton);

    // Assert
    await waitFor(() => {
      expect(localStorage.getItem('token')).toEqual(token);
    });
  });

  it('should show error message if login fails', async () => {
    // Arrange
    const { result } = renderHook(() => useToastStore());
    server.use(getTRPCMockError({ path: ['auth', 'login'], type: 'mutation', status: 500, message: 'my big error' }));
    render(<LoginContainer />);

    // Act
    const loginButton = screen.getByRole('button', { name: 'Login' });
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'test' } });
    fireEvent.click(loginButton);

    // Assert
    await waitFor(() => {
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].description).toEqual('my big error');
      expect(result.current.toasts[0].status).toEqual('error');
    });
    const token = localStorage.getItem('token');
    expect(token).toBeNull();
  });
});
