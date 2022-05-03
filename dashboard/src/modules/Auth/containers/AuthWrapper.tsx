import { useToast } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import LoadingScreen from '../../../components/LoadingScreen';
import { useAuthStore } from '../../../state/authStore';
import Login from './Login';
import Onboarding from './Onboarding';

const AuthWrapper: React.FC = ({ children }) => {
  const [initialLoad, setInitialLoad] = useState(true);
  const { configured, loading, user, login, me, fetchConfigured, register } = useAuthStore();
  const toast = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      await me();
      await fetchConfigured();

      setInitialLoad(false);
    };
    if (!user) fetchUser();
  }, [fetchConfigured, me, user]);

  const handleError = (error: unknown) => {
    if (error instanceof Error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        position: 'top',
        isClosable: true,
      });
    }
  };

  const handleLogin = async (values: { email: string; password: string }) => {
    try {
      await login(values.email, values.password);
      await me();
    } catch (error) {
      handleError(error);
    }
  };

  const handleRegister = async (values: { email: string; password: string }) => {
    try {
      await register(values.email, values.password);
      await me();
    } catch (error) {
      handleError(error);
    }
  };

  if (initialLoad && !user) {
    return <LoadingScreen />;
  }

  if (user) {
    return <>{children}</>;
  }

  if (!configured) {
    return <Onboarding loading={loading} onSubmit={handleRegister} />;
  }

  return <Login loading={loading} onSubmit={handleLogin} />;
};

export default AuthWrapper;
