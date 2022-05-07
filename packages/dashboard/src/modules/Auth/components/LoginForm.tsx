import { Button } from '@chakra-ui/react';
import React from 'react';
import { Field, Form } from 'react-final-form';
import validator from 'validator';
import FormInput from '../../../components/Form/FormInput';

type FormValues = { email: string; password: string };

interface IProps {
  onSubmit: (values: FormValues) => void;
  loading: boolean;
}

const LoginForm: React.FC<IProps> = ({ onSubmit, loading }) => {
  const validateFields = (values: FormValues) => {
    const errors: Record<string, string> = {};

    if (!validator.isEmail(values.email || '')) {
      errors.email = 'Invalid email';
    }

    if (!values.password) {
      errors.password = 'Required';
    }

    return errors;
  };

  return (
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
              <FormInput size="lg" className="mt-3 w-full" error={meta.error} isInvalid={meta.invalid && (meta.submitError || meta.submitFailed)} placeholder="Password" type="password" {...input} />
            )}
          />
          <Button isLoading={validating || submitting || loading} className="mt-2" colorScheme="green" type="submit">
            Login
          </Button>
        </form>
      )}
    />
  );
};

export default LoginForm;
