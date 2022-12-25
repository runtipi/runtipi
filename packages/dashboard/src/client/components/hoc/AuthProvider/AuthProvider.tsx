import React from 'react';
import { useConfiguredQuery, useMeQuery } from '../../../generated/graphql';
import { LoginContainer } from '../../../modules/Auth/containers/LoginContainer';
import { RegisterContainer } from '../../../modules/Auth/containers/RegisterContainer';
import { StatusScreen } from '../../StatusScreen';

interface IProps {
  children: React.ReactElement;
}

export const AuthProvider: React.FC<IProps> = ({ children }) => {
  const user = useMeQuery();
  const isConfigured = useConfiguredQuery();
  const loading = user.loading || isConfigured.loading;

  if (loading && !user.data?.me) {
    return <StatusScreen title="" subtitle="" />;
  }

  if (user.data?.me) {
    return children;
  }

  if (!isConfigured?.data?.isConfigured) {
    return <RegisterContainer />;
  }

  return <LoginContainer />;
};
