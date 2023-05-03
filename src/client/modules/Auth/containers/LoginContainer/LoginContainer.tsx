import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/router';
import { trpc } from '../../../../utils/trpc';
import { AuthFormLayout } from '../../components/AuthFormLayout';
import { LoginForm } from '../../components/LoginForm';
import { TotpForm } from '../../components/TotpForm';

type FormValues = { email: string; password: string };

export const LoginContainer: React.FC = () => {
  const [totpSessionId, setTotpSessionId] = useState<string | null>(null);
  const router = useRouter();
  const utils = trpc.useContext();
  const login = trpc.auth.login.useMutation({
    onError: (e) => {
      toast.error(`Login failed: ${e.message}`);
    },
    onSuccess: (data) => {
      if (data.totpSessionId) {
        setTotpSessionId(data.totpSessionId);
      } else {
        utils.auth.me.invalidate();
        router.push('/');
      }
    },
  });

  const verifyTotp = trpc.auth.verifyTotp.useMutation({
    onError: (e) => {
      toast.error(`Verification failed: ${e.message}`);
    },
    onSuccess: () => {
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
