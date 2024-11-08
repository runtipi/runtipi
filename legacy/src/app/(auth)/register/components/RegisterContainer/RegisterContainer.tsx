'use client';

import { registerAction } from '@/actions/register/register-action';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { toast } from 'react-hot-toast';
import { RegisterForm } from '../RegisterForm';

export const RegisterContainer: React.FC = () => {
  const router = useRouter();

  const registerMutation = useAction(registerAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onSuccess: () => {
      router.push('/dashboard');
    },
  });

  return (
    <RegisterForm
      onSubmit={({ email, password }) => registerMutation.execute({ username: email, password })}
      loading={registerMutation.status === 'executing' || registerMutation.status === 'hasSucceeded'}
    />
  );
};
