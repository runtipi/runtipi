import { Button, Container, Flex, SlideFade, Text } from '@chakra-ui/react';
import React from 'react';
import { Field, Form } from 'react-final-form';
import validator from 'validator';
import FormInput from '../../../components/Form/FormInput';

type FormValues = { email: string; password: string; passwordConfirm: string };

interface IProps {
  onSubmit: (values: FormValues) => void;
  loading: boolean;
}

const Onboarding: React.FC<IProps> = ({ onSubmit, loading }) => {
  const validateFields = (values: FormValues) => {
    const errors: Record<string, string> = {};

    if (!validator.isEmail(values.email || '')) {
      errors.email = 'Invalid email';
    }

    if (!values.password) {
      errors.password = 'Required';
    }

    if (values.password !== values.passwordConfirm) {
      errors.passwordConfirm = 'Passwords do not match';
    }

    return errors;
  };

  return (
    <Container maxW="1250px">
      <Flex flex={1} height="100vh" overflowY="hidden">
        <SlideFade in className="flex flex-1 flex-col justify-center items-center" offsetY="20px">
          <img className="self-center mb-5 logo" src="/tipi.png" width={512} height={512} />
          <Text className="text-xl md:text-2xl lg:text-5xl font-bold" size="3xl">
            Welcome to your Tipi
          </Text>
          <Text className="md:text-lg lg:text-2xl text-center" color="gray.500">
            Register your account to get started
          </Text>
          <Form<FormValues>
            onSubmit={onSubmit}
            validateOnBlur={true}
            validate={(values) => validateFields(values)}
            render={({ handleSubmit, validating, submitting }) => (
              <form className="flex flex-col" onSubmit={handleSubmit}>
                <Field
                  name="email"
                  render={({ input, meta }) => (
                    <FormInput size="lg" className="mt-3 w-full" error={meta.error} isInvalid={meta.invalid && (meta.submitError || meta.submitFailed)} placeholder="Email" {...input} />
                  )}
                />
                <Field
                  name="password"
                  render={({ input, meta }) => (
                    <FormInput
                      size="lg"
                      className="mt-3 w-full"
                      error={meta.error}
                      isInvalid={meta.invalid && (meta.submitError || meta.submitFailed)}
                      placeholder="Password"
                      type="password"
                      {...input}
                    />
                  )}
                />
                <Field
                  name="passwordConfirm"
                  render={({ input, meta }) => (
                    <FormInput
                      size="lg"
                      className="mt-3 w-full"
                      error={meta.error}
                      isInvalid={meta.invalid && (meta.submitError || meta.submitFailed)}
                      placeholder="Repeat password"
                      type="password"
                      {...input}
                    />
                  )}
                />
                <Button isLoading={validating || submitting || loading} className="mt-2" colorScheme="green" type="submit">
                  Enter
                </Button>
              </form>
            )}
          />
        </SlideFade>
      </Flex>
    </Container>
  );
};

export default Onboarding;
