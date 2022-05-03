import { useToast } from '@chakra-ui/react';
import React from 'react';
import { useAuthStore } from '../../../state/authStore';
import AuthFormLayout from '../components/AuthFormLayout';
import RegisterForm from '../components/RegisterForm';

const Onboarding: React.FC = () => {
  const toast = useToast();
  const { me, register, loading } = useAuthStore();

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

  const handleRegister = async (values: { email: string; password: string }) => {
    try {
      await register(values.email, values.password);
      await me();
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <AuthFormLayout title="Welcome to your Tipi" description="Register your account to get started">
      <RegisterForm onSubmit={handleRegister} loading={loading} />
    </AuthFormLayout>
  );
};

export default Onboarding;
