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
    onSuccess: (data) => {
      if (!data.success) {
        toast.error(data.failure.reason);
      }
    },
  });

  const cancelRequestMutation = useAction(cancelResetPasswordAction, {
    onSuccess: (data) => {
      if (!data.success) {
        toast.error(data.failure.reason);
      }
    },
  });

  if (resetPasswordMutation.res.data?.success && resetPasswordMutation.res.data?.email) {
    return (
      <>
        <h2 className="h2 text-center mb-3">{t('auth.reset-password.success-title')}</h2>
        <p>{t('auth.reset-password.success', { email: resetPasswordMutation.res.data.email })}</p>
        <Button onClick={() => router.push('/login')} type="button" className="btn btn-primary w-100">
          {t('auth.reset-password.back-to-login')}
        </Button>
      </>
    );
  }

  return (
    <ResetPasswordForm
      loading={resetPasswordMutation.isExecuting}
      onCancel={() => cancelRequestMutation.execute()}
      onSubmit={({ password }) => resetPasswordMutation.execute({ newPassword: password })}
    />
  );
};
