import { Button } from '@chakra-ui/react';
import React from 'react';
import { Form, Field } from 'react-final-form';
import FormInput from '../../../components/Form/FormInput';
import FormSwitch from '../../../components/Form/FormSwitch';
import { validateAppConfig } from '../../../components/Form/validators';
import { AppInfo, FormField } from '../../../generated/graphql';

interface IProps {
  formFields: AppInfo['form_fields'];
  onSubmit: (values: Record<string, unknown>) => void;
  initalValues?: Record<string, string>;
  exposable?: boolean | null;
}

export type IFormValues = {
  exposed?: boolean;
  domain?: string;
  [key: string]: string | boolean | undefined;
};

const hiddenTypes = ['random'];
const typeFilter = (field: FormField) => !hiddenTypes.includes(field.type);

const InstallForm: React.FC<IProps> = ({ formFields, onSubmit, initalValues, exposable }) => {
  const renderField = (field: FormField) => {
    return (
      <Field
        key={field.env_variable}
        name={field.env_variable}
        render={({ input, meta }) => (
          <FormInput hint={field.hint || ''} className="mb-3" error={meta.error} isInvalid={meta.invalid && (meta.submitError || meta.submitFailed)} label={field.label} {...input} />
        )}
      />
    );
  };

  const renderExposeForm = (isExposedChecked?: boolean) => {
    return (
      <>
        <Field key="exposed" name="exposed" type="checkbox" render={({ input }) => <FormSwitch className="mb-3" label="Expose app ?" {...input} />} />
        {isExposedChecked && (
          <>
            <Field
              key="domain"
              name="domain"
              render={({ input, meta }) => <FormInput className="mb-3" error={meta.error} isInvalid={meta.invalid && (meta.submitError || meta.submitFailed)} label="Domain name" {...input} />}
            />
            <span className="text-sm">
              Make sure this exact domain contains an <strong>A</strong> record pointing to your IP.
            </span>
          </>
        )}
      </>
    );
  };

  return (
    <Form<IFormValues>
      initialValues={initalValues}
      onSubmit={onSubmit}
      validateOnBlur={true}
      validate={(values) => validateAppConfig(values, formFields)}
      render={({ handleSubmit, validating, submitting, values }) => (
        <form className="flex flex-col" onSubmit={handleSubmit}>
          <>
            {formFields.filter(typeFilter).map(renderField)}
            {exposable && renderExposeForm(values.exposed)}
            <Button isLoading={validating || submitting} className="self-end mb-2" colorScheme="green" type="submit">
              {initalValues ? 'Update' : 'Install'}
            </Button>
          </>
        </form>
      )}
    />
  );
};

export default InstallForm;
