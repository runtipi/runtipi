import { useToast } from '@chakra-ui/react';
import React, { useState } from 'react';
import { useLoginMutation } from '../../../generated/graphql';
import AuthFormLayout from '../components/AuthFormLayout';
import LoginForm from '../components/LoginForm';

type FormValues = { email: string; password: string };

const Login: React.FC = () => {
  const [login] = useLoginMutation({ refetchQueries: ['Me'] });
  const [loading, setLoading] = useState(false);
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
      setLoading(true);
      await login({ variables: { input: { username: values.email, password: values.password } } });
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormLayout title="Welcome back" description="Enter your credentials to login to your Tipi">
      <LoginForm onSubmit={handleLogin} loading={loading} />
    </AuthFormLayout>
  );
};

export default Login;
