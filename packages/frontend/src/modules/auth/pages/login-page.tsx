import { loginMutation, verifyTotpMutation } from '@/api-client/@tanstack/react-query.gen';
import { useUserContext } from '@/context/user-context';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router';
import { LoginForm } from '../components/login-form';
import { TotpForm } from '../components/totp-form/totp-form';

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const LoginPage = () => {
  const { isLoggedIn, isConfigured, refreshUserContext, setUserContext } = useUserContext();
  const [totpSessionId, setTotpSessionId] = useState<string | null>(null);
  const queryString = window.location.search;
  const params = new URLSearchParams(queryString);
  const redirectUri = params.get('redirect_uri');
  const app = capitalize(params.get('app') ?? '') || 'your account';

  const { t } = useTranslation();
  const navigate = useNavigate();

  const login = useMutation({
    ...loginMutation(),
    onSuccess: async (data) => {
      if (data?.success && data.totpSessionId) {
        setTotpSessionId(data.totpSessionId);
      } else {
        setUserContext({ isLoggedIn: true });
        refreshUserContext();
        if (redirectUri) {
          window.location.href = redirectUri;
          return;
        }
        navigate('/dashboard');
      }
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const verifyTotp = useMutation({
    ...verifyTotpMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onSuccess: () => {
      setUserContext({ isLoggedIn: true });
      refreshUserContext();
      if (redirectUri) {
        window.location.href = redirectUri;
        return;
      }
      navigate('/dashboard');
    },
  });

  if (isLoggedIn) {
    if (redirectUri) {
      window.location.href = redirectUri;
      return;
    }
    return <Navigate to="/dashboard" />;
  }

  if (!isConfigured) {
    return <Navigate to="/register" />;
  }

  if (totpSessionId) {
    return <TotpForm loading={verifyTotp.isPending} onSubmit={(totpCode) => verifyTotp.mutate({ body: { totpCode, totpSessionId } })} />;
  }

  return (
    <LoginForm
      onSubmit={(values) => login.mutate({ body: { password: values.password, username: values.email } })}
      loading={login.isPending}
      app={app}
    />
  );
};
