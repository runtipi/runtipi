import { ErrorPage } from '@/components/error/error-page';
import { Navigate } from 'react-router';

export default function BackendErrorPage() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  const resetTo = params.get('reset_to') ?? '/';

  if (!error) {
    return <Navigate to="/" />;
  }

  const handleReset = () => {
    window.location.href = resetTo;
  };

  return <ErrorPage error={new Error(error)} onReset={() => handleReset()} />;
}
