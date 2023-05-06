import { useRouter } from 'next/router';
import React from 'react';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { Button } from '../../../../components/ui/Button';
import { trpc } from '../../../../utils/trpc';
import { AuthFormLayout } from '../../components/AuthFormLayout';
import { ResetPasswordForm } from '../../components/ResetPasswordForm';

type Props = {
  isRequested: boolean;
};

type FormValues = { password: string };

export const ResetPasswordContainer: React.FC<Props> = ({ isRequested }) => {
  const t = useTranslations();
  const router = useRouter();
  const utils = trpc.useContext();
  const resetPassword = trpc.auth.changeOperatorPassword.useMutation({
    onSuccess: () => {
      utils.auth.checkPasswordChangeRequest.invalidate();
    },
    onError: (e) => {
      let toastMessage = e.message;
      if (e.data?.translatedError) {
        toastMessage = t(e.data.translatedError);
      }
      toast.error(toastMessage);
    },
  });
  const cancelRequest = trpc.auth.cancelPasswordChangeRequest.useMutation({
    onSuccess: () => {
      utils.auth.checkPasswordChangeRequest.invalidate();
      toast.success('Password change request cancelled');
    },
  });

  const handlerSubmit = (value: FormValues) => {
    resetPassword.mutate({ newPassword: value.password });
  };

  const renderContent = () => {
    if (resetPassword.isSuccess) {
      return (
        <>
          <h2 className="h2 text-center mb-3">{t('auth.reset-password.success-title')}</h2>
          <p>{t('auth.reset-password.success', { email: resetPassword.data.email })}</p>
          <Button onClick={() => router.push('/login')} type="button" className="btn btn-primary w-100">
            {t('auth.reset-password.back-to-login')}
          </Button>
        </>
      );
    }

    if (isRequested) {
      return <ResetPasswordForm onSubmit={handlerSubmit} onCancel={() => cancelRequest.mutate()} loading={resetPassword.isLoading} />;
    }

    return (
      <>
        <h2 className="h2 text-center mb-3">{t('auth.reset-password.title')}</h2>
        <p>{t('auth.reset-password.instructions')}</p>
        <pre>
          <code>./scripts/reset-password.sh</code>
        </pre>
      </>
    );
  };

  return <AuthFormLayout>{renderContent()}</AuthFormLayout>;
};
