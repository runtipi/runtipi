import { userContext, type GetProviderAuthUrlResponse } from '@/api-client';
import { getProviderAuthUrlMutation, getProvidersPublicOptions, loginMutation, verifyTotpMutation } from '@/api-client/@tanstack/react-query.gen';
import { useUserContext } from '@/context/user-context';
import type { TranslatableError } from '@/types/error.types';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Navigate, redirect, useNavigate, useSearchParams } from 'react-router';
import { LoginForm } from '../components/login-form';
import { TotpForm } from '../components/totp-form/totp-form';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const isSafeRedirect = (url: string) => new URL(url).host.endsWith(`.${window.location.host}`);

export async function clientLoader() {
  const user = await userContext();

  if (!user.data?.isConfigured) {
    return redirect('/register');
  }

  if (user.data?.isLoggedIn) {
    return redirect('/dashboard');
  }
}

export default () => {
  const { isLoggedIn, isConfigured, refreshUserContext, setUserContext } = useUserContext();
  const [totpSessionId, setTotpSessionId] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const redirect_url = searchParams.get('redirect_url');
  const app = searchParams.get('app');

  const { t } = useTranslation();
  const navigate = useNavigate();

  const loginType = capitalize(app ?? '') || t('AUTH_LOGIN_TYPE_ACCOUNT');
  const { data: oauthProviders } = useSuspenseQuery({
    ...getProvidersPublicOptions(),
  });

  const login = useMutation({
    ...loginMutation(),
    onSuccess: async (data) => {
      if (data?.success && data.totpSessionId) {
        setTotpSessionId(data.totpSessionId);
      } else {
        setUserContext({ isLoggedIn: true });
        refreshUserContext();

        if (redirect_url && isSafeRedirect(redirect_url)) {
          window.location.href = redirect_url;
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

      if (redirect_url && isSafeRedirect(redirect_url)) {
        window.location.href = redirect_url;
        return;
      }
      navigate('/dashboard');
    },
  });

  const getOAuthUrl = useMutation({
    ...getProviderAuthUrlMutation(),
    onSuccess: (res: GetProviderAuthUrlResponse) => {
      toast.success(t('SETTINGS_SECURITY_OAUTH_AUTHORIZE_REDIRECT'));
      setTimeout(() => {
        window.location.href = res.url;
      }, 500);
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  if (isLoggedIn) {
    if (redirect_url && isSafeRedirect(redirect_url)) {
      window.location.href = redirect_url;
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
      loginType={loginType}
      oauthProviders={oauthProviders.providers}
      onOAuthClick={(provider) => getOAuthUrl.mutate({ path: { id: provider.id } })}
    />
  );
};
