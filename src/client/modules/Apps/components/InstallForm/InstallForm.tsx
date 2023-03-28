import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '../../../../components/ui/Button';
import { Switch } from '../../../../components/ui/Switch';
import { Input } from '../../../../components/ui/Input';
import { validateAppConfig } from '../../utils/validators';
import { FormField } from '../../../../core/types';

interface IProps {
  formFields: FormField[];
  onSubmit: (values: FormValues) => void;
  initalValues?: { exposed?: boolean; domain?: string } & { [key: string]: string | boolean | undefined };
  loading?: boolean;
  exposable?: boolean | null;
}

export type FormValues = {
  exposed?: boolean;
  domain?: string;
  [key: string]: string | boolean | undefined;
};

const hiddenTypes = ['random'];
const typeFilter = (field: FormField) => !hiddenTypes.includes(field.type);

export const InstallForm: React.FC<IProps> = ({ formFields, onSubmit, initalValues, exposable, loading }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    setError,
  } = useForm<FormValues>({});
  const watchExposed = watch('exposed', false);

  useEffect(() => {
    if (initalValues && !isDirty) {
      Object.entries(initalValues).forEach(([key, value]) => {
        setValue(key, value);
      });
    }
  }, [initalValues, isDirty, setValue]);

  const renderField = (field: FormField) => (
    <Input
      key={field.env_variable}
      {...register(field.env_variable)}
      label={field.label}
      error={errors[field.env_variable]?.message}
      disabled={loading}
      className="mb-3"
      placeholder={field.hint || field.label}
    />
  );

  const renderExposeForm = () => (
    <>
      <Switch className="mb-3" {...register('exposed')} label="Expose app" />
      {watchExposed && (
        <div className="mb-3">
          <Input {...register('domain')} label="Domain name" error={errors.domain?.message} disabled={loading} placeholder="Domain name" />
          <span className="text-muted">
            Make sure this exact domain contains an <strong>A</strong> record pointing to your IP.
          </span>
        </div>
      )}
    </>
  );

  const validate = (values: FormValues) => {
    const validationErrors = validateAppConfig(values, formFields);

    Object.entries(validationErrors).forEach(([key, value]) => {
      if (value) {
        setError(key, { message: value });
      }
    });

    if (Object.keys(validationErrors).length === 0) {
      onSubmit(values);
    }
  };

  const name = initalValues ? 'update' : 'install';

  return (
    <form data-testid={`${name}-form`} className="flex flex-col" onSubmit={handleSubmit(validate)}>
      {formFields.filter(typeFilter).map(renderField)}
      {exposable && renderExposeForm()}
      <Button loading={loading} type="submit" className="btn-success">
        {initalValues ? 'Update' : 'Install'}
      </Button>
    </form>
  );
};
