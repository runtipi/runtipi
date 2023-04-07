import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { useToastStore } from '../../../../state/toastStore';
import { trpc } from '../../../../utils/trpc';
import { AuthFormLayout } from '../../components/AuthFormLayout';
import { LoginForm } from '../../components/LoginForm';
import { TotpForm } from '../../components/TotpForm';

type FormValues = { email: string; password: string };

export const LoginContainer: React.FC = () => {
  const [totpSessionId, setTotpSessionId] = useState<string | null>(null);
  const router = useRouter();
  const { addToast } = useToastStore();
  const utils = trpc.useContext();
  const login = trpc.auth.login.useMutation({
    onError: (e) => {
      localStorage.removeItem('token');
      addToast({ title: 'Login error', description: e.message, status: 'error' });
    },
    onSuccess: (data) => {
      if (data.totpSessionId) {
        setTotpSessionId(data.totpSessionId);
      } else if (data.token) {
        localStorage.setItem('token', data.token);
        utils.auth.me.invalidate();
        router.push('/');
      }
    },
  });

  const verifyTotp = trpc.auth.verifyTotp.useMutation({
    onError: (e) => {
      addToast({ title: 'Error', description: e.message, status: 'error' });
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      utils.auth.me.invalidate();
      router.push('/');
    },
  });

  const handlerSubmit = (values: FormValues) => {
    login.mutate({ username: values.email, password: values.password });
  };

  return (
    <AuthFormLayout>
      {totpSessionId ? (
        <TotpForm onSubmit={(o) => verifyTotp.mutate({ totpCode: o, totpSessionId })} loading={verifyTotp.isLoading} />
      ) : (
        <LoginForm onSubmit={handlerSubmit} loading={login.isLoading} />
      )}
    </AuthFormLayout>
  );
};
