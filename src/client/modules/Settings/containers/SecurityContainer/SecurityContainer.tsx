import React from 'react';
import { IconLock, IconKey } from '@tabler/icons-react';
import { OtpForm } from '../../components/OtpForm';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';

export const SecurityContainer = () => {
  return (
    <div className="card-body">
      <div className="d-flex">
        <IconKey className="me-2" />
        <h2>Change password</h2>
      </div>
      <p className="text-muted">Changing your password will log you out of all devices.</p>
      <ChangePasswordForm />
      <div className="d-flex">
        <IconLock className="me-2" />
        <h2>Two-Factor Authentication</h2>
      </div>
      <p className="text-muted">
        Two-factor authentication (2FA) adds an additional layer of security to your account.
        <br />
        When enabled, you will be prompted to enter a code from your authenticator app when you log in.
      </p>
      <OtpForm />
    </div>
  );
};
