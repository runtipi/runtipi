import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouteError } from 'react-router';
import { ErrorPage } from '../error/error-page';

export const RouteError = () => {
  const error = useRouteError();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const onRetry = () => {
    queryClient.resetQueries();
    navigate('/');
  };

  return <ErrorPage error={error as Error} onReset={onRetry} />;
};
