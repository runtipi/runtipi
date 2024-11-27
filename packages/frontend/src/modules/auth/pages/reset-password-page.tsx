import { cancelResetPasswordMutation, checkResetPasswordRequestOptions, resetPasswordMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import type { TranslatableError } from '@/types/error.types';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import type React from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ResetPasswordForm } from '../components/reset-password-form/reset-password-form';

export const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data } = useSuspenseQuery({
    ...checkResetPasswordRequestOptions(),
  });

  const resetPassword = useMutation({
    ...resetPasswordMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const cancelRequest = useMutation({
    ...cancelResetPasswordMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  if (resetPassword.data?.success && resetPassword.data?.email) {
    return (
      <>
        <h2 className="h2 text-center mb-3">{t('AUTH_RESET_PASSWORD_SUCCESS_TITLE')}</h2>
        <p>{t('AUTH_RESET_PASSWORD_SUCCESS', { email: resetPassword.data.email })}</p>
        <Button onClick={() => navigate('/login')} type="button" intent="primary" className="w-100">
          {t('AUTH_RESET_PASSWORD_BACK_TO_LOGIN')}
        </Button>
      </>
    );
  }

  if (!data.isRequestPending) {
    return (
      <>
        <h2 className="h2 text-center mb-3">{t('AUTH_RESET_PASSWORD_TITLE')}</h2>
        <p>{t('AUTH_RESET_PASSWORD_INSTRUCTIONS')}</p>
        <pre>
          <code>./runtipi-cli reset-password</code>
        </pre>
      </>
    );
  }

  return (
    <ResetPasswordForm
      loading={resetPassword.isPending || cancelRequest.isPending}
      onCancel={() => cancelRequest.mutate({})}
      onSubmit={({ password }) => resetPassword.mutate({ body: { newPassword: password } })}
    />
  );
};
