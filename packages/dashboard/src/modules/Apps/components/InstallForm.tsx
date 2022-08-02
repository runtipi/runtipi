import { Button } from '@chakra-ui/react';
import React from 'react';
import { Form, Field } from 'react-final-form';
import FormInput from '../../../components/Form/FormInput';
import { validateAppConfig } from '../../../components/Form/validators';
import { AppInfo, FormField } from '../../../generated/graphql';

interface IProps {
  formFields: AppInfo['form_fields'];
  onSubmit: (values: Record<string, unknown>) => void;
  initalValues?: Record<string, string>;
}

const hiddenTypes = ['random'];
const typeFilter = (field: FormField) => !hiddenTypes.includes(field.type);

const InstallForm: React.FC<IProps> = ({ formFields, onSubmit, initalValues }) => {
  const renderField = (field: FormField) => {
    return (
      <Field
        key={field.env_variable}
        name={field.env_variable}
        render={({ input, meta }) => <FormInput className="mb-3" error={meta.error} isInvalid={meta.invalid && (meta.submitError || meta.submitFailed)} label={field.label} {...input} />}
      />
    );
  };

  return (
    <Form<Record<string, string>>
      initialValues={initalValues}
      onSubmit={onSubmit}
      validateOnBlur={true}
      validate={(values) => validateAppConfig(values, formFields)}
      render={({ handleSubmit, validating, submitting }) => (
        <form className="flex flex-col" onSubmit={handleSubmit}>
          {formFields.filter(typeFilter).map(renderField)}
          <Button isLoading={validating || submitting} className="self-end mb-2" colorScheme="green" type="submit">
            {initalValues ? 'Update' : 'Install'}
          </Button>
        </form>
      )}
    />
  );
};

export default InstallForm;
