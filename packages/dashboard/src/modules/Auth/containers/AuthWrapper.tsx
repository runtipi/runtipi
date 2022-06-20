import React from 'react';
import LoadingScreen from '../../../components/LoadingScreen';
import { useConfiguredQuery, useMeQuery } from '../../../generated/graphql';
import Login from './Login';
import Onboarding from './Onboarding';

interface IProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<IProps> = ({ children }) => {
  const user = useMeQuery();
  const isConfigured = useConfiguredQuery();
  const loading = user.loading || isConfigured.loading;

  if (loading && !user.data?.me) {
    return <LoadingScreen />;
  }

  if (user.data?.me) {
    return <>{children}</>;
  }

  if (!isConfigured?.data?.isConfigured) {
    return <Onboarding />;
  }

  return <Login />;
};

export default AuthWrapper;
