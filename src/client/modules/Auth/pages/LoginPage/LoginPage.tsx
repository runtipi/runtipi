import { useRouter } from 'next/router';
import React from 'react';
import { StatusScreen } from '../../../../components/StatusScreen';
import { trpc } from '../../../../utils/trpc';
import { LoginContainer } from '../../containers/LoginContainer';

export const LoginPage = () => {
  const router = useRouter();
  const { data, isLoading } = trpc.auth.isConfigured.useQuery();

  if (data === false) {
    router.push('/register');
  }

  if (isLoading) {
    return <StatusScreen title="" subtitle="" />;
  }

  return <LoginContainer />;
};
