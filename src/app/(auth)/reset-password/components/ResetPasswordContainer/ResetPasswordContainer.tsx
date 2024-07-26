'use client';

import React from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { resetPasswordAction } from '@/actions/reset-password/reset-password-action';
import { cancelResetPasswordAction } from '@/actions/cancel-reset-password/cancel-reset-password-action';
import { ResetPasswordForm } from '../ResetPasswordForm';

export const ResetPasswordContainer: React.FC = () => {
  const t = useTranslations();
  const router = useRouter();

  const resetPasswordMutation = useAction(resetPasswordAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
  });

  const cancelRequestMutation = useAction(cancelResetPasswordAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
  });

  if (resetPasswordMutation.result.data?.success && resetPasswordMutation.result.data?.email) {
    return (
      <>
        <h2 className="h2 text-center mb-3">{t('AUTH_RESET_PASSWORD_SUCCESS_TITLE')}</h2>
        <p>{t('AUTH_RESET_PASSWORD_SUCCESS', { email: resetPasswordMutation.result.data.email })}</p>
        <Button onClick={() => router.push('/login')} type="button" intent="primary" className="w-100">
          {t('AUTH_RESET_PASSWORD_BACK_TO_LOGIN')}
        </Button>
      </>
    );
  }

  return (
    <ResetPasswordForm
      loading={resetPasswordMutation.status === 'executing' || cancelRequestMutation.status === 'executing'}
      onCancel={() => cancelRequestMutation.execute()}
      onSubmit={({ password }) => resetPasswordMutation.execute({ newPassword: password })}
    />
  );
};
