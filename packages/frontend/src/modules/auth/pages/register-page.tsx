import { userContext } from '@/api-client';
import { registerMutation } from '@/api-client/@tanstack/react-query.gen';
import { useUserContext } from '@/context/user-context';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Navigate, redirect, useNavigate } from 'react-router';
import { RegisterForm } from '../components/register-form';

export async function clientLoader() {
  const user = await userContext();

  if (user.data?.isConfigured) {
    return redirect('/login');
  }

  if (user.data?.isLoggedIn) {
    return redirect('/dashboard');
  }
}

export default () => {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const { isConfigured, isLoggedIn, refreshUserContext, setUserContext } = useUserContext();

  const register = useMutation({
    ...registerMutation(),
    onSuccess: async () => {
      setUserContext({ isLoggedIn: true });
      refreshUserContext();
      navigate('/dashboard');
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  if (isLoggedIn) {
    return <Navigate to="/dashboard" />;
  }

  if (isConfigured) {
    return <Navigate to="/login" />;
  }

  return (
    <RegisterForm
      onSubmit={(values) => register.mutate({ body: { password: values.password, username: values.email } })}
      loading={register.isPending}
    />
  );
};
