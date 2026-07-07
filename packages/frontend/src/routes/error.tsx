import { ErrorPage } from '@/components/error/error-page';
import { Navigate } from 'react-router';

export default function BackendErrorPage() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');

  if (!error) {
    return <Navigate to="/" />;
  }

  return <ErrorPage error={new Error(error)} onReset={() => window.location.reload()} />;
}
