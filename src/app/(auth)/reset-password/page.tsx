import React from 'react';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { getTranslatorFromCookie } from '@/lib/get-translator';
import { ResetPasswordContainer } from './components/ResetPasswordContainer';

export default async function ResetPasswordPage() {
  const isRequested = AuthServiceClass.checkPasswordChangeRequest();
  const translator = await getTranslatorFromCookie();

  if (isRequested) {
    return <ResetPasswordContainer />;
  }

  return (
    <>
      <h2 className="h2 text-center mb-3">{translator('auth.reset-password.title')}</h2>
      <p>{translator('auth.reset-password.instructions')}</p>
      <pre>
        <code>./runtipi-cli reset-password</code>
      </pre>
    </>
  );
}
