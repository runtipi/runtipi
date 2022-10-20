import { useApolloClient } from '@apollo/client';
import { useToast } from '@chakra-ui/react';
import React, { useState } from 'react';
import { useLoginMutation } from '../../../generated/graphql';
import AuthFormLayout from '../components/AuthFormLayout';
import LoginForm from '../components/LoginForm';

type FormValues = { email: string; password: string };

const Login: React.FC = () => {
  const client = useApolloClient();
  const [login] = useLoginMutation({});
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleError = (error: unknown) => {
    localStorage.removeItem('token');
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
      const { data } = await login({ variables: { input: { username: values.email, password: values.password } } });

      if (data?.login?.token) {
        await localStorage.setItem('token', data.login.token);
      }

      await client.refetchQueries({ include: ['Me'] });
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
