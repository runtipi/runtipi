import router from 'next/router';
import React, { useState } from 'react';
import { useRegisterMutation } from '../../../../generated/graphql';
import { useToastStore } from '../../../../state/toastStore';
import { AuthFormLayout } from '../../components/AuthFormLayout';
import { RegisterForm } from '../../components/RegisterForm';

export const RegisterContainer: React.FC = () => {
  const { addToast } = useToastStore();
  const [register] = useRegisterMutation({ refetchQueries: ['Me'] });
  const [loading, setLoading] = useState(false);

  const handleError = (error: unknown) => {
    if (error instanceof Error) {
      addToast({
        title: 'Error',
        description: error.message,
        status: 'error',
        position: 'top',
        isClosable: true,
      });
    }
  };

  const handleRegister = async (values: { email: string; password: string }) => {
    try {
      setLoading(true);
      const { data } = await register({ variables: { input: { username: values.email, password: values.password } } });

      if (data?.register?.token) {
        localStorage.setItem('token', data.register.token);
        router.reload();
      } else {
        setLoading(false);
        handleError(new Error('Something went wrong'));
      }
    } catch (error) {
      setLoading(false);
      handleError(error);
    }
  };

  return (
    <AuthFormLayout>
      <RegisterForm onSubmit={handleRegister} loading={loading} />
    </AuthFormLayout>
  );
};
