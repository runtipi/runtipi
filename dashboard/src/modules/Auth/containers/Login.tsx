import { useToast } from '@chakra-ui/react';
import React from 'react';
import { useAuthStore } from '../../../state/authStore';
import AuthFormLayout from '../components/AuthFormLayout';
import LoginForm from '../components/LoginForm';

type FormValues = { email: string; password: string };

const Login: React.FC = () => {
  const { me, login, loading } = useAuthStore();
  const toast = useToast();

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

  const handleLogin = async (values: FormValues) => {
    try {
      await login(values.email, values.password);
      await me();
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <AuthFormLayout title="Welcome back" description="Enter your credentials to login to your Tipi">
      <LoginForm onSubmit={handleLogin} loading={loading} />
    </AuthFormLayout>
  );
};

export default Login;
