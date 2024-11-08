import { useMutation } from '@tanstack/react-query';
import { RegisterForm } from '../components/register-form';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useUserContext } from '@/context/user-context';
import { registerMutation } from '@/api-client/@tanstack/react-query.gen';
import type { TranslatableError } from '@/types/error.types';

export const RegisterPage = () => {
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
