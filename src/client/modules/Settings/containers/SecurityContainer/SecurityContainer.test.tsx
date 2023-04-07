import React from 'react';
import { server } from '@/client/mocks/server';
import { getTRPCMock, getTRPCMockError } from '@/client/mocks/getTrpcMock';
import { useToastStore } from '@/client/state/toastStore';
import { renderHook } from '@testing-library/react';
import { render, screen, waitFor, fireEvent } from '../../../../../../tests/test-utils';
import { SecurityContainer } from './SecurityContainer';

describe('<SecurityContainer />', () => {
  it('should render', () => {
    render(<SecurityContainer />);
  });

  it('should prompt for password when enabling 2FA', async () => {
    // arrange
    render(<SecurityContainer />);
    const twoFactorAuthButton = screen.getByRole('switch', { name: /Enable two-factor authentication/i });
    await waitFor(() => {
      expect(twoFactorAuthButton).toBeEnabled();
    });

    // act
    twoFactorAuthButton.click();

    // assert
    await waitFor(() => {
      expect(screen.getByText('Password needed')).toBeInTheDocument();
    });
  });

  it('should prompt for password when disabling 2FA', async () => {
    // arrange
    server.use(getTRPCMock({ path: ['auth', 'me'], response: { totp_enabled: true, id: 12, username: 'test' } }));
    render(<SecurityContainer />);
    const twoFactorAuthButton = screen.getByRole('switch', { name: /Enable two-factor authentication/i });
    await waitFor(() => {
      expect(twoFactorAuthButton).toBeEnabled();
    });

    // act
    twoFactorAuthButton.click();

    // assert
    await waitFor(() => {
      expect(screen.getByText('Password needed')).toBeInTheDocument();
    });
  });

  it('should show show error toast if password is incorrect while enabling 2FA', async () => {
    // arrange
    const { result } = renderHook(() => useToastStore());
    server.use(getTRPCMock({ path: ['auth', 'me'], response: { totp_enabled: false, id: 12, username: 'test' } }));
    server.use(getTRPCMockError({ path: ['auth', 'getTotpUri'], type: 'mutation', message: 'Invalid password' }));
    render(<SecurityContainer />);
    const twoFactorAuthButton = screen.getByRole('switch', { name: /Enable two-factor authentication/i });
    await waitFor(() => {
      expect(twoFactorAuthButton).toBeEnabled();
    });

    // act
    twoFactorAuthButton.click();

    await waitFor(() => {
      expect(screen.getByText('Password needed')).toBeInTheDocument();
    });

    const passwordInput = screen.getByRole('textbox', { name: 'password' });
    fireEvent.change(passwordInput, { target: { value: 'test' } });
    const submitButton = screen.getByRole('button', { name: /Enable 2FA/i });
    submitButton.click();

    // assert
    await waitFor(() => {
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]?.status).toEqual('error');
      expect(result.current.toasts[0]?.title).toEqual('Error');
      expect(result.current.toasts[0]?.description).toEqual('Invalid password');
    });
  });

  it('should show show error toast if password is incorrect while disabling 2FA', async () => {
    // arrange
    const { result } = renderHook(() => useToastStore());
    server.use(getTRPCMock({ path: ['auth', 'me'], response: { totp_enabled: true, id: 12, username: 'test' } }));
    server.use(getTRPCMockError({ path: ['auth', 'disableTotp'], type: 'mutation', message: 'Invalid password' }));
    render(<SecurityContainer />);

    const twoFactorAuthButton = screen.getByRole('switch', { name: /Enable two-factor authentication/i });
    await waitFor(() => {
      expect(twoFactorAuthButton).toBeEnabled();
    });

    // act
    twoFactorAuthButton.click();

    await waitFor(() => {
      expect(screen.getByText('Password needed')).toBeInTheDocument();
    });

    const passwordInput = screen.getByRole('textbox', { name: 'password' });
    fireEvent.change(passwordInput, { target: { value: 'test' } });
    const submitButton = screen.getByRole('button', { name: /Disable 2FA/i });
    submitButton.click();

    // assert
    await waitFor(() => {
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]?.status).toEqual('error');
      expect(result.current.toasts[0]?.title).toEqual('Error');
      expect(result.current.toasts[0]?.description).toEqual('Invalid password');
    });
  });

  it('should show success toast if password is correct while disabling 2FA', async () => {
    // arrange
    const { result } = renderHook(() => useToastStore());
    server.use(getTRPCMock({ path: ['auth', 'me'], response: { totp_enabled: true, id: 12, username: 'test' } }));
    server.use(getTRPCMock({ path: ['auth', 'disableTotp'], type: 'mutation', response: true }));

    render(<SecurityContainer />);

    const twoFactorAuthButton = screen.getByRole('switch', { name: /Enable two-factor authentication/i });
    await waitFor(() => {
      expect(twoFactorAuthButton).toBeEnabled();
    });

    // act
    twoFactorAuthButton.click();

    await waitFor(() => {
      expect(screen.getByText('Password needed')).toBeInTheDocument();
    });

    const passwordInput = screen.getByRole('textbox', { name: 'password' });
    fireEvent.change(passwordInput, { target: { value: 'test' } });
    const submitButton = screen.getByRole('button', { name: /Disable 2FA/i });
    submitButton.click();

    // assert
    await waitFor(() => {
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]?.status).toEqual('success');
      expect(result.current.toasts[0]?.title).toEqual('Success');
      expect(result.current.toasts[0]?.description).toEqual('Two-factor authentication disabled');
    });
  });

  it('should show secret key and QR code when enabling 2FA', async () => {
    // arrange
    server.use(getTRPCMock({ path: ['auth', 'getTotpUri'], type: 'mutation', response: { key: 'test', uri: 'test' } }));
    render(<SecurityContainer />);
    const twoFactorAuthButton = screen.getByRole('switch', { name: /Enable two-factor authentication/i });
    await waitFor(() => {
      expect(twoFactorAuthButton).toBeEnabled();
    });

    // act
    twoFactorAuthButton.click();
    await waitFor(() => {
      expect(screen.getByText('Password needed')).toBeInTheDocument();
    });
    const passwordInput = screen.getByRole('textbox', { name: 'password' });
    fireEvent.change(passwordInput, { target: { value: 'test' } });
    const submitButton = screen.getByRole('button', { name: /Enable 2FA/i });
    submitButton.click();

    // assert
    await waitFor(() => {
      expect(screen.getByText('Scan this QR code with your authenticator app.')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'secret key' })).toHaveValue('test');
      expect(screen.getByRole('button', { name: 'Enable 2FA' })).toBeDisabled();
    });
  });

  it('should show error toast if submitted totp code is invalid', async () => {
    // arrange
    const { result } = renderHook(() => useToastStore());
    server.use(getTRPCMock({ path: ['auth', 'getTotpUri'], type: 'mutation', response: { key: 'test', uri: 'test' } }));
    server.use(getTRPCMockError({ path: ['auth', 'setupTotp'], type: 'mutation', message: 'Invalid code' }));

    render(<SecurityContainer />);

    const twoFactorAuthButton = screen.getByRole('switch', { name: /Enable two-factor authentication/i });
    await waitFor(() => {
      expect(twoFactorAuthButton).toBeEnabled();
    });

    // act
    twoFactorAuthButton.click();
    await waitFor(() => {
      expect(screen.getByText('Password needed')).toBeInTheDocument();
    });
    const passwordInput = screen.getByRole('textbox', { name: 'password' });
    fireEvent.change(passwordInput, { target: { value: 'test' } });
    const submitButton = screen.getByRole('button', { name: /Enable 2FA/i });
    submitButton.click();

    await waitFor(() => {
      expect(screen.getByText('Scan this QR code with your authenticator app.')).toBeInTheDocument();
    });

    const inputEls = screen.getAllByRole('textbox', { name: /digit-/ });

    inputEls.forEach((inputEl) => {
      fireEvent.change(inputEl, { target: { value: '1' } });
    });

    const enable2FAButton = screen.getByRole('button', { name: 'Enable 2FA' });
    enable2FAButton.click();

    // assert
    await waitFor(() => {
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]?.status).toEqual('error');
      expect(result.current.toasts[0]?.title).toEqual('Error');
      expect(result.current.toasts[0]?.description).toEqual('Invalid code');
    });
  });

  it('should show success toast if submitted totp code is valid', async () => {
    // arrange
    const { result } = renderHook(() => useToastStore());
    server.use(getTRPCMock({ path: ['auth', 'getTotpUri'], type: 'mutation', response: { key: 'test', uri: 'test' } }));
    server.use(getTRPCMock({ path: ['auth', 'setupTotp'], type: 'mutation', response: true }));
    render(<SecurityContainer />);
    const twoFactorAuthButton = screen.getByRole('switch', { name: /Enable two-factor authentication/i });
    await waitFor(() => {
      expect(twoFactorAuthButton).toBeEnabled();
    });

    // act
    twoFactorAuthButton.click();
    await waitFor(() => {
      expect(screen.getByText('Password needed')).toBeInTheDocument();
    });
    const passwordInput = screen.getByRole('textbox', { name: 'password' });
    fireEvent.change(passwordInput, { target: { value: 'test' } });
    const submitButton = screen.getByRole('button', { name: /Enable 2FA/i });
    submitButton.click();

    await waitFor(() => {
      expect(screen.getByText('Scan this QR code with your authenticator app.')).toBeInTheDocument();
    });

    const inputEls = screen.getAllByRole('textbox', { name: /digit-/ });

    inputEls.forEach((inputEl) => {
      fireEvent.change(inputEl, { target: { value: '1' } });
    });

    const enable2FAButton = screen.getByRole('button', { name: 'Enable 2FA' });
    enable2FAButton.click();

    // assert
    await waitFor(() => {
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]?.status).toEqual('success');
      expect(result.current.toasts[0]?.title).toEqual('Success');
      expect(result.current.toasts[0]?.description).toEqual('Two-factor authentication enabled');
    });
  });

  it('can close the setup modal by clicking on the esc key', async () => {
    // arrange
    render(<SecurityContainer />);
    const twoFactorAuthButton = screen.getByRole('switch', { name: /Enable two-factor authentication/i });
    await waitFor(() => {
      expect(twoFactorAuthButton).toBeEnabled();
    });

    // act
    twoFactorAuthButton.click();
    await waitFor(() => {
      expect(screen.getByText('Password needed')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    // assert
    await waitFor(() => {
      expect(screen.queryByText('Password needed')).not.toBeInTheDocument();
    });
  });

  it('can close the disable modal by clicking on the esc key', async () => {
    // arrange
    server.use(getTRPCMock({ path: ['auth', 'me'], response: { totp_enabled: true, username: '', id: 1 } }));
    render(<SecurityContainer />);
    const twoFactorAuthButton = screen.getByRole('switch', { name: /Enable two-factor authentication/i });
    await waitFor(() => {
      expect(twoFactorAuthButton).toBeEnabled();
    });

    // act
    twoFactorAuthButton.click();
    await waitFor(() => {
      expect(screen.getByText('Password needed')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    // assert
    await waitFor(() => {
      expect(screen.queryByText('Password needed')).not.toBeInTheDocument();
    });
  });
});
