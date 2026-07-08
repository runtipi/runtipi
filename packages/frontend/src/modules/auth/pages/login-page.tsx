import { type GetProviderAuthUrlResponse, userContext } from '@/api-client';
import { getLoginProvidersOptions, getProviderAuthUrlMutation, loginMutation, verifyTotpMutation } from '@/api-client/@tanstack/react-query.gen';
import { useUserContext } from '@/context/user-context';
import type { TranslatableError } from '@/types/error.types';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Navigate, redirect, useNavigate, useSearchParams } from 'react-router';
import { LoginForm } from '../components/login-form';
import { TotpForm } from '../components/totp-form/totp-form';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const isSafeRedirect = (url: string) => {
  try {
    const redirectUrl = new URL(url);
    return ['http:', 'https:'].includes(redirectUrl.protocol) && redirectUrl.hostname.endsWith(`.${window.location.hostname}`);
  } catch {
    return false;
  }
};

const createForwardAuthSession = async (redirectUrl: string) => {
  const response = await fetch('/api/auth/forward-auth', {
    body: JSON.stringify({ redirectUrl }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Unable to create forward-auth session');
  }

  const body = (await response.json()) as { redirectUrl?: string };
  if (!body.redirectUrl) {
    throw new Error('Unable to create forward-auth redirect');
  }

  return body.redirectUrl;
};

export async function clientLoader() {
  const user = await userContext();

  if (!user.data?.isConfigured) {
    return redirect('/register');
  }

  if (user.data?.isLoggedIn) {
    const redirectUrl = new URL(window.location.href).searchParams.get('redirect_url');
    if (redirectUrl && isSafeRedirect(redirectUrl)) {
      return;
    }

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
    ...getLoginProvidersOptions(),
  });

  useEffect(() => {
    if (!isLoggedIn || !redirect_url || !isSafeRedirect(redirect_url)) {
      return;
    }

    let cancelled = false;

    createForwardAuthSession(redirect_url)
      .then((authRedirectUrl) => {
        if (!cancelled) {
          window.location.href = authRedirectUrl;
        }
      })
      .catch(() => {
        if (!cancelled) {
          navigate('/dashboard');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, navigate, redirect_url]);

  const login = useMutation({
    ...loginMutation(),
    onSuccess: async (data) => {
      if (data?.success && data.totpSessionId) {
        setTotpSessionId(data.totpSessionId);
      } else {
        setUserContext({ isLoggedIn: true });
        refreshUserContext();

        if (redirect_url && isSafeRedirect(redirect_url) && data.redirectUrl) {
          window.location.href = data.redirectUrl;
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
    onSuccess: (data) => {
      setUserContext({ isLoggedIn: true });
      refreshUserContext();

      if (redirect_url && isSafeRedirect(redirect_url) && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      navigate('/dashboard');
    },
  });

  const getOAuthURL = useMutation({
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
      return null;
    }
    return <Navigate to="/dashboard" />;
  }

  if (!isConfigured) {
    return <Navigate to="/register" />;
  }

  if (totpSessionId) {
    return (
      <TotpForm
        loading={verifyTotp.isPending}
        onSubmit={(totpCode) => verifyTotp.mutate({ body: { redirectUrl: redirect_url ?? undefined, totpCode, totpSessionId } })}
      />
    );
  }

  return (
    <LoginForm
      onSubmit={(values) => login.mutate({ body: { password: values.password, redirectUrl: redirect_url ?? undefined, username: values.email } })}
      loading={login.isPending}
      loginType={loginType}
      oauthProviders={oauthProviders.providers}
      onOAuthClick={(provider) => getOAuthURL.mutate({ path: { slug: provider.slug } })}
    />
  );
};
