import React from 'react';
import { server } from '@/client/mocks/server';
import { getTRPCMock, getTRPCMockError } from '@/client/mocks/getTrpcMock';
import { render, screen, waitFor, fireEvent } from '../../../../../../tests/test-utils';
import { OtpForm } from './OtpForm';

describe('<OtpForm />', () => {
  it('should render', () => {
    render(<OtpForm />);
  });

  it('should prompt for password when enabling 2FA', async () => {
    // arrange
    render(<OtpForm />);
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
    server.use(getTRPCMock({ path: ['auth', 'me'], response: { totpEnabled: true, id: 12, username: 'test' } }));
    render(<OtpForm />);
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
    server.use(getTRPCMock({ path: ['auth', 'me'], response: { totpEnabled: false, id: 12, username: 'test' } }));
    server.use(getTRPCMockError({ path: ['auth', 'getTotpUri'], type: 'mutation', message: 'Invalid password' }));
    render(<OtpForm />);
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
      expect(screen.getByText(/Invalid password/)).toBeInTheDocument();
    });
  });

  it('should show show error toast if password is incorrect while disabling 2FA', async () => {
    // arrange
    server.use(getTRPCMock({ path: ['auth', 'me'], response: { totpEnabled: true, id: 12, username: 'test' } }));
    server.use(getTRPCMockError({ path: ['auth', 'disableTotp'], type: 'mutation', message: 'Invalid password' }));
    render(<OtpForm />);

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
      expect(screen.getByText(/Invalid password/)).toBeInTheDocument();
    });
  });

  it('should show success toast if password is correct while disabling 2FA', async () => {
    // arrange
    server.use(getTRPCMock({ path: ['auth', 'me'], response: { totpEnabled: true, id: 12, username: 'test' } }));
    server.use(getTRPCMock({ path: ['auth', 'disableTotp'], type: 'mutation', response: true }));

    render(<OtpForm />);

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
      expect(screen.getByText('Two-factor authentication disabled')).toBeInTheDocument();
    });
  });

  it('should show secret key and QR code when enabling 2FA', async () => {
    // arrange
    server.use(getTRPCMock({ path: ['auth', 'getTotpUri'], type: 'mutation', response: { key: 'test', uri: 'test' } }));
    render(<OtpForm />);
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
    });
    expect(screen.getByRole('textbox', { name: 'secret key' })).toHaveValue('test');
    expect(screen.getByRole('button', { name: 'Enable 2FA' })).toBeDisabled();
  });

  it('should show error toast if submitted totp code is invalid', async () => {
    // arrange
    server.use(getTRPCMock({ path: ['auth', 'getTotpUri'], type: 'mutation', response: { key: 'test', uri: 'test' } }));
    server.use(getTRPCMockError({ path: ['auth', 'setupTotp'], type: 'mutation', message: 'Invalid code' }));

    render(<OtpForm />);

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
      expect(screen.getByText(/Invalid code/)).toBeInTheDocument();
    });
  });

  it('should show success toast if submitted totp code is valid', async () => {
    // arrange
    server.use(getTRPCMock({ path: ['auth', 'getTotpUri'], type: 'mutation', response: { key: 'test', uri: 'test' } }));
    server.use(getTRPCMock({ path: ['auth', 'setupTotp'], type: 'mutation', response: true }));
    render(<OtpForm />);
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
      expect(screen.getByText('Two-factor authentication enabled')).toBeInTheDocument();
    });
  });

  it('can close the setup modal by clicking on the esc key', async () => {
    // arrange
    render(<OtpForm />);
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
    server.use(getTRPCMock({ path: ['auth', 'me'], response: { totpEnabled: true, username: '', id: 1 } }));
    render(<OtpForm />);
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
