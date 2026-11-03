import { ErrorPage } from '@/components/error/error-page';
import { Navigate, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

export default function BackendErrorPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');

  if (!error) {
    return <Navigate to="/" />;
  }

  const destination = params.get('redirect_to') === 'settings' ? '/settings?tab=security' : '/login';
  const message = error === 'AUTH_ERROR_OIDC' ? t('AUTH_ERROR_OIDC') : t('AUTH_ERROR_UNKNOWN');

  return <ErrorPage error={new Error(message)} onReset={() => navigate(destination, { replace: true })} />;
}
