import { useRouter } from 'next/router';
import React from 'react';
import { useToastStore } from '../../../../state/toastStore';
import { trpc } from '../../../../utils/trpc';
import { AuthFormLayout } from '../../components/AuthFormLayout';
import { RegisterForm } from '../../components/RegisterForm';

type FormValues = { email: string; password: string };

export const RegisterContainer: React.FC = () => {
  const { addToast } = useToastStore();
  const router = useRouter();
  const utils = trpc.useContext();
  const register = trpc.auth.register.useMutation({
    onError: (e) => {
      localStorage.removeItem('token');
      addToast({ title: 'Register error', description: e.message, status: 'error' });
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      utils.auth.me.invalidate();
      router.push('/');
    },
  });

  const handlerSubmit = (value: FormValues) => {
    register.mutate({ username: value.email, password: value.password });
  };

  return (
    <AuthFormLayout>
      <RegisterForm onSubmit={handlerSubmit} loading={register.isLoading} />
    </AuthFormLayout>
  );
};
