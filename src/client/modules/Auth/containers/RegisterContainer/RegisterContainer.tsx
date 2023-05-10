import { useRouter } from 'next/router';
import React from 'react';
import { toast } from 'react-hot-toast';
import { useLocale } from '@/client/hooks/useLocale';
import { useTranslations } from 'next-intl';
import type { MessageKey } from '@/server/utils/errors';
import { trpc } from '../../../../utils/trpc';
import { AuthFormLayout } from '../../components/AuthFormLayout';
import { RegisterForm } from '../../components/RegisterForm';

type FormValues = { email: string; password: string };

export const RegisterContainer: React.FC = () => {
  const t = useTranslations();
  const { locale } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();
  const register = trpc.auth.register.useMutation({
    onError: (e) => toast.error(t(e.data?.tError.message as MessageKey, { ...e.data?.tError?.variables })),
    onSuccess: () => {
      utils.auth.me.invalidate();
      router.push('/');
    },
  });

  const handlerSubmit = (value: FormValues) => {
    register.mutate({ username: value.email, password: value.password, locale });
  };

  return (
    <AuthFormLayout>
      <RegisterForm onSubmit={handlerSubmit} loading={register.isLoading} />
    </AuthFormLayout>
  );
};
