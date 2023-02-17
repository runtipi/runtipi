import { faker } from '@faker-js/faker';
import React from 'react';
import { fireEvent, render, renderHook, screen, waitFor } from '../../../../../../tests/test-utils';
import { getTRPCMock, getTRPCMockError } from '../../../../mocks/getTrpcMock';
import { server } from '../../../../mocks/server';
import { useToastStore } from '../../../../state/toastStore';
import { RegisterContainer } from './RegisterContainer';

describe('Test: RegisterContainer', () => {
  it('should render without error', () => {
    render(<RegisterContainer />);

    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  it('should add token in localStorage on submit', async () => {
    // Arrange
    const email = faker.internet.email();
    const password = faker.internet.password();
    const token = faker.datatype.uuid();

    server.use(getTRPCMock({ path: ['auth', 'register'], type: 'mutation', response: { token }, delay: 100 }));
    render(<RegisterContainer />);

    // Act
    const registerButton = screen.getByRole('button', { name: 'Register' });
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm password');

    fireEvent.change(emailInput, { target: { value: email } });
    fireEvent.change(passwordInput, { target: { value: password } });
    fireEvent.change(confirmPasswordInput, { target: { value: password } });
    fireEvent.click(registerButton);

    // Assert
    await waitFor(() => expect(localStorage.getItem('token')).toEqual(token));
  });

  it('should show toast if register mutation fails', async () => {
    // Arrange
    const email = faker.internet.email();
    const password = faker.internet.password();

    const { result } = renderHook(() => useToastStore());
    server.use(getTRPCMockError({ path: ['auth', 'register'], type: 'mutation', status: 500, message: 'my big error' }));
    render(<RegisterContainer />);

    // Act
    const registerButton = screen.getByRole('button', { name: 'Register' });
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm password');

    fireEvent.change(emailInput, { target: { value: email } });
    fireEvent.change(passwordInput, { target: { value: password } });
    fireEvent.change(confirmPasswordInput, { target: { value: password } });
    fireEvent.click(registerButton);

    // Assert
    await waitFor(() => {
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].description).toEqual('my big error');
      expect(result.current.toasts[0].status).toEqual('error');
    });
  });
});
