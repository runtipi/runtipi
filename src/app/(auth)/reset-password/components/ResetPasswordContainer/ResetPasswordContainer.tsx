'use client';

import React from 'react';
import { useAction } from 'next-safe-action/hook';
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
    onError: (error) => {
      if (error.serverError) toast.error(error.serverError);
    },
  });

  const cancelRequestMutation = useAction(cancelResetPasswordAction, {
    onError: (error) => {
      if (error.serverError) toast.error(error.serverError);
    },
  });

  if (resetPasswordMutation.result.data?.success && resetPasswordMutation.result.data?.email) {
    return (
      <>
        <h2 className="h2 text-center mb-3">{t('auth.reset-password.success-title')}</h2>
        <p>{t('auth.reset-password.success', { email: resetPasswordMutation.result.data.email })}</p>
        <Button onClick={() => router.push('/login')} type="button" className="btn btn-primary w-100">
          {t('auth.reset-password.back-to-login')}
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
