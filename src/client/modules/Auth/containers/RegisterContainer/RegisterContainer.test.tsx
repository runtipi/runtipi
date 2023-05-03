import { faker } from '@faker-js/faker';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../../../../../tests/test-utils';
import { getTRPCMock, getTRPCMockError } from '../../../../mocks/getTrpcMock';
import { server } from '../../../../mocks/server';
import { RegisterContainer } from './RegisterContainer';

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

describe('Test: RegisterContainer', () => {
  it('should render without error', () => {
    render(<RegisterContainer />);

    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  it.only('should redirect to / upon successful registration', async () => {
    // Arrange
    const email = faker.internet.email();
    const password = faker.internet.password();

    server.use(getTRPCMock({ path: ['auth', 'register'], type: 'mutation', response: true, delay: 100 }));
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
      expect(pushFn).toHaveBeenCalledWith('/');
    });
  });

  it('should show toast if register mutation fails', async () => {
    // Arrange
    const email = faker.internet.email();
    const password = faker.internet.password();

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
      expect(screen.getByText('Registration failed: my big error')).toBeInTheDocument();
    });
  });
});
