import { useRouter } from 'next/router';
import React from 'react';
import { Button } from '../../../../components/ui/Button';
import { useToastStore } from '../../../../state/toastStore';
import { trpc } from '../../../../utils/trpc';
import { AuthFormLayout } from '../../components/AuthFormLayout';
import { ResetPasswordForm } from '../../components/ResetPasswordForm';

type Props = {
  isRequested: boolean;
};

type FormValues = { password: string };

export const ResetPasswordContainer: React.FC<Props> = ({ isRequested }) => {
  const { addToast } = useToastStore();
  const router = useRouter();
  const utils = trpc.useContext();
  const resetPassword = trpc.auth.changeOperatorPassword.useMutation({
    onSuccess: () => {
      utils.auth.checkPasswordChangeRequest.invalidate();
    },
    onError: (error) => {
      addToast({ title: 'Reset password error', description: error.message, status: 'error' });
    },
  });
  const cancelRequest = trpc.auth.cancelPasswordChangeRequest.useMutation({
    onSuccess: () => {
      utils.auth.checkPasswordChangeRequest.invalidate();
      addToast({ title: 'Password change request cancelled', status: 'success' });
    },
  });

  const handlerSubmit = (value: FormValues) => {
    resetPassword.mutate({ newPassword: value.password });
  };

  const renderContent = () => {
    if (resetPassword.isSuccess) {
      return (
        <>
          <h2 className="h2 text-center mb-3">Password reset</h2>
          <p>Your password has been reset. You can now login with your new password. And your email {resetPassword.data.email}</p>
          <Button onClick={() => router.push('/login')} type="button" className="btn btn-primary w-100">
            Back to login
          </Button>
        </>
      );
    }

    if (isRequested) {
      return <ResetPasswordForm onSubmit={handlerSubmit} onCancel={() => cancelRequest.mutate()} loading={resetPassword.isLoading} />;
    }

    return (
      <>
        <h2 className="h2 text-center mb-3">Reset your password</h2>
        <p>Run this command on your server and then refresh this page</p>
        <pre>
          <code>./scripts/reset-password.sh</code>
        </pre>
      </>
    );
  };

  return <AuthFormLayout>{renderContent()}</AuthFormLayout>;
};
