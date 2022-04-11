import { Button } from '@chakra-ui/react';
import React from 'react';
import { Form, Field } from 'react-final-form';
import FormInput from '../../../components/Form/FormInput';
import { validateAppConfig } from '../../../components/Form/validators';
import { AppConfig } from '../../../core/types';
import { objectKeys } from '../../../utils/typescript';

interface IProps {
  formFields: AppConfig['form_fields'];
  onSubmit: (values: Record<string, unknown>) => void;
}

const InstallForm: React.FC<IProps> = ({ formFields, onSubmit }) => {
  const fields = objectKeys(formFields).map((key) => ({ ...formFields[key], id: key }));

  const renderField = (field: typeof fields[0]) => {
    return <Field key={field.id} name={field.id} render={({ input, meta }) => <FormInput className="mb-3" error={meta.error} label={field.label} {...input} />} />;
  };

  return (
    <Form<Record<string, string>>
      onSubmit={onSubmit}
      validateOnBlur={true}
      validate={(values) => validateAppConfig(values, fields)}
      render={({ handleSubmit, validating, submitting }) => (
        <form className="flex flex-col" onSubmit={handleSubmit}>
          {fields.map(renderField)}
          <Button isLoading={validating || submitting} className="self-end mb-2" colorScheme="green" type="submit">
            Install
          </Button>
        </form>
      )}
    />
  );
};

export default InstallForm;
