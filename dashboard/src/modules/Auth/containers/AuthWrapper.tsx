import React, { useEffect, useState } from 'react';
import LoadingScreen from '../../../components/LoadingScreen';
import { useAuthStore } from '../../../state/authStore';
import Login from './Login';
import Onboarding from './Onboarding';

const AuthWrapper: React.FC = ({ children }) => {
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
