import { faker } from '@faker-js/faker';
import { graphql } from 'msw';
import React from 'react';
import { fireEvent, render, renderHook, screen, waitFor } from '../../../../../tests/test-utils';
import { useMeQuery } from '../../../../generated/graphql';
import { server } from '../../../../mocks/server';
import { useToastStore } from '../../../../state/toastStore';
import { RegisterContainer } from './RegisterContainer';

describe('Test: RegisterContainer', () => {
  it('should render without error', () => {
    render(<RegisterContainer />);

    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  it('should call register mutation on submit', async () => {
    // Arrange
    const email = faker.internet.email();
    const password = faker.internet.password();
    const token = faker.datatype.uuid();

    renderHook(() => useMeQuery());
    const registerFn = jest.fn();
    const fakeRegisterHandler = graphql.mutation('Register', (req, res, ctx) => {
      registerFn(req.variables.input);
      sessionStorage.setItem('is-authenticated', email);
      return res(ctx.data({ register: { token } }));
    });
    server.use(fakeRegisterHandler);
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
    await waitFor(() => expect(registerFn).toHaveBeenCalledWith({ username: email, password }));
    expect(localStorage.getItem('token')).toEqual(token);
  });

  it('should show toast if register mutation fails', async () => {
    // Arrange
    const email = faker.internet.email();
    const password = faker.internet.password();

    renderHook(() => useMeQuery());
    const { result } = renderHook(() => useToastStore());
    const fakeRegisterHandler = graphql.mutation('Register', (req, res, ctx) => res(ctx.errors([{ message: 'my big error' }])));
    server.use(fakeRegisterHandler);
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
