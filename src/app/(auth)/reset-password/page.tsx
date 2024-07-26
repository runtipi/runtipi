import React from 'react';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { getTranslator } from '@/lib/get-translator';
import { ResetPasswordContainer } from './components/ResetPasswordContainer';

export default async function ResetPasswordPage() {
  const authService = new AuthServiceClass();
  const isRequested = await authService.checkPasswordChangeRequest();

  if (isRequested) {
    return <ResetPasswordContainer />;
  }

  const translator = await getTranslator();

  return (
    <>
      <h2 className="h2 text-center mb-3">{translator('AUTH_RESET_PASSWORD_TITLE')}</h2>
      <p>{translator('AUTH_RESET_PASSWORD_INSTRUCTIONS')}</p>
      <pre>
        <code>./runtipi-cli reset-password</code>
      </pre>
    </>
  );
}
