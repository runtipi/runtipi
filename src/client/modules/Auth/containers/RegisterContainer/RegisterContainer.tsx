import { useRouter } from 'next/router';
import React from 'react';
import { toast } from 'react-hot-toast';
import { useLocale } from '@/client/hooks/useLocale';
import { useTranslations } from 'next-intl';
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
    onError: (e) => {
      let toastMessage = e.message;
      if (e.data?.translatedError) {
        toastMessage = t(e.data.translatedError);
      }
      toast.error(toastMessage);
    },
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
