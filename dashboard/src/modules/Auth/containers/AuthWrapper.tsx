import React, { useEffect, useState } from 'react';
import LoadingScreen from '../../../components/LoadingScreen';
import { useAuthStore } from '../../../state/authStore';
import Login from './Login';
import Onboarding from './Onboarding';

interface IProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<IProps> = ({ children }) => {
  const [initialLoad, setInitialLoad] = useState(true);
  const { configured, user, me, fetchConfigured } = useAuthStore();

  useEffect(() => {
    const fetchUser = async () => {
      await me();
      await fetchConfigured();

      setInitialLoad(false);
    };
    if (!user) fetchUser();
  }, [fetchConfigured, me, user]);

  if (initialLoad && !user) {
    return <LoadingScreen />;
  }

  if (user) {
    return <>{children}</>;
  }

  if (!configured) {
    return <Onboarding />;
  }

  return <Login />;
};

export default AuthWrapper;
