import React from 'react';
import { useToastStore } from '../../../../state/toastStore';
import { trpc } from '../../../../utils/trpc';
import { AuthFormLayout } from '../../components/AuthFormLayout';
import { LoginForm } from '../../components/LoginForm';

type FormValues = { email: string; password: string };

export const LoginContainer: React.FC = () => {
  const { addToast } = useToastStore();
  const utils = trpc.useContext();
  const login = trpc.auth.login.useMutation({
    onError: (e) => {
      localStorage.removeItem('token');
      addToast({ title: 'Login error', description: e.message, status: 'error' });
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      utils.auth.me.invalidate();
    },
  });

  const handlerSubmit = (values: FormValues) => {
    login.mutate({ username: values.email, password: values.password });
  };

  return (
    <AuthFormLayout>
      <LoginForm onSubmit={handlerSubmit} loading={login.isLoading} />
    </AuthFormLayout>
  );
};
