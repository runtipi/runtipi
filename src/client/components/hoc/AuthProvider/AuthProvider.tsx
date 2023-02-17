import React from 'react';
import { LoginContainer } from '../../../modules/Auth/containers/LoginContainer';
import { RegisterContainer } from '../../../modules/Auth/containers/RegisterContainer';
import { trpc } from '../../../utils/trpc';
import { StatusScreen } from '../../StatusScreen';

interface IProps {
  children: React.ReactElement;
}

export const AuthProvider: React.FC<IProps> = ({ children }) => {
  const me = trpc.auth.me.useQuery();
  const isConfigured = trpc.auth.isConfigured.useQuery();
  const loading = me.isLoading || isConfigured.isLoading;

  if (loading) {
    return <StatusScreen title="" subtitle="" />;
  }

  if (me.data) {
    return children;
  }

  if (!isConfigured?.data) {
    return <RegisterContainer />;
  }

  return <LoginContainer />;
};
