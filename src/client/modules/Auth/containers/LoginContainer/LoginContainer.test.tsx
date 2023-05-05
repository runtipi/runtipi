import { faker } from '@faker-js/faker';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../../../../../tests/test-utils';
import { getTRPCMock, getTRPCMockError } from '../../../../mocks/getTrpcMock';
import { server } from '../../../../mocks/server';
import { LoginContainer } from './LoginContainer';

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

beforeEach(() => {
  pushFn.mockClear();
});

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
    const emailInput = screen.getByRole('textbox', { name: 'email' });
    const passwordInput = screen.getByRole('textbox', { name: 'password' });

    // Act
    fireEvent.change(emailInput, { target: { value: faker.internet.email() } });
    fireEvent.change(passwordInput, { target: { value: faker.internet.password() } });

    // Assert
    expect(loginButton).toBeEnabled();
  });

  it('should redirect to / upon successful login', async () => {
    // Arrange
    const email = faker.internet.email();
    const password = faker.internet.password();
    server.use(getTRPCMock({ path: ['auth', 'login'], type: 'mutation', response: {} }));
    render(<LoginContainer />);

    // Act
    const loginButton = screen.getByRole('button', { name: 'Login' });
    const emailInput = screen.getByRole('textbox', { name: 'email' });
    const passwordInput = screen.getByRole('textbox', { name: 'password' });

    fireEvent.change(emailInput, { target: { value: email } });
    fireEvent.change(passwordInput, { target: { value: password } });
    fireEvent.click(loginButton);

    // Assert
    await waitFor(() => {
      expect(pushFn).toHaveBeenCalledWith('/');
    });
  });

  it('should show error message if login fails', async () => {
    // Arrange
    server.use(getTRPCMockError({ path: ['auth', 'login'], type: 'mutation', status: 500, message: 'my big error' }));
    render(<LoginContainer />);

    // Act
    const loginButton = screen.getByRole('button', { name: 'Login' });
    const emailInput = screen.getByRole('textbox', { name: 'email' });
    const passwordInput = screen.getByRole('textbox', { name: 'password' });

    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'test' } });
    fireEvent.click(loginButton);

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/my big error/)).toBeInTheDocument();
    });
  });

  it('should show totp form if totpSessionId is returned', async () => {
    // arrange
    const email = faker.internet.email();
    const password = faker.internet.password();
    const totpSessionId = faker.datatype.uuid();
    server.use(
      getTRPCMock({
        path: ['auth', 'login'],
        type: 'mutation',
        response: { totpSessionId },
      }),
    );
    render(<LoginContainer />);

    // act
    const loginButton = screen.getByRole('button', { name: 'Login' });
    const emailInput = screen.getByRole('textbox', { name: 'email' });
    const passwordInput = screen.getByRole('textbox', { name: 'password' });

    fireEvent.change(emailInput, { target: { value: email } });
    fireEvent.change(passwordInput, { target: { value: password } });
    fireEvent.click(loginButton);

    // assert
    await waitFor(() => {
      expect(screen.getByText('Two-factor authentication')).toBeInTheDocument();
    });
  });

  it('should show error message if totp code is invalid', async () => {
    // arrange
    const email = faker.internet.email();
    const password = faker.internet.password();
    const totpSessionId = faker.datatype.uuid();
    server.use(getTRPCMock({ path: ['auth', 'login'], type: 'mutation', response: { totpSessionId } }));
    server.use(getTRPCMockError({ path: ['auth', 'verifyTotp'], type: 'mutation', status: 500, message: 'Invalid totp code' }));
    render(<LoginContainer />);

    // act
    const loginButton = screen.getByRole('button', { name: 'Login' });
    const emailInput = screen.getByRole('textbox', { name: 'email' });
    const passwordInput = screen.getByRole('textbox', { name: 'password' });

    fireEvent.change(emailInput, { target: { value: email } });
    fireEvent.change(passwordInput, { target: { value: password } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Two-factor authentication')).toBeInTheDocument();
    });

    const totpInputs = screen.getAllByRole('textbox', { name: /digit/ });

    totpInputs.forEach((input, index) => {
      fireEvent.change(input, { target: { value: index } });
    });

    const totpSubmitButton = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(totpSubmitButton);

    // assert
    await waitFor(() => {
      expect(screen.getByText(/Invalid totp code/)).toBeInTheDocument();
    });
  });

  it('should redirect to / if totp is valid', async () => {
    // arrange
    const email = faker.internet.email();
    const password = faker.internet.password();
    const totpSessionId = faker.datatype.uuid();
    server.use(getTRPCMock({ path: ['auth', 'login'], type: 'mutation', response: { totpSessionId } }));
    server.use(getTRPCMock({ path: ['auth', 'verifyTotp'], type: 'mutation', response: true }));
    render(<LoginContainer />);

    // act
    const loginButton = screen.getByRole('button', { name: 'Login' });
    const emailInput = screen.getByRole('textbox', { name: 'email' });
    const passwordInput = screen.getByRole('textbox', { name: 'password' });

    fireEvent.change(emailInput, { target: { value: email } });
    fireEvent.change(passwordInput, { target: { value: password } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Two-factor authentication')).toBeInTheDocument();
    });

    const totpInputs = screen.getAllByRole('textbox', { name: /digit/ });

    totpInputs.forEach((input, index) => {
      fireEvent.change(input, { target: { value: index } });
    });

    const totpSubmitButton = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(totpSubmitButton);

    // assert
    await waitFor(() => {
      expect(pushFn).toHaveBeenCalledWith('/');
    });
  });
});
