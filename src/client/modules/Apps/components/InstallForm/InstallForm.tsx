import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Tooltip } from 'react-tooltip';
import clsx from 'clsx';
import { Button } from '../../../../components/ui/Button';
import { Switch } from '../../../../components/ui/Switch';
import { Input } from '../../../../components/ui/Input';
import { validateAppConfig } from '../../utils/validators';
import { type FormField } from '../../../../core/types';

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
    control,
  } = useForm<FormValues>({});
  const watchExposed = watch('exposed', false);

  useEffect(() => {
    if (initalValues && !isDirty) {
      Object.entries(initalValues).forEach(([key, value]) => {
        setValue(key, value);
      });
    }
  }, [initalValues, isDirty, setValue]);

  const renderField = (field: FormField) => {
    const label = (
      <>
        {field.label}
        {field.required && <span className="ms-1 text-danger">*</span>}
        {Boolean(field.hint) && (
          <>
            <Tooltip anchorSelect={`.${field.env_variable}`}>{field.hint}</Tooltip>
            <span className={clsx('ms-1 form-help', field.env_variable)}>?</span>
          </>
        )}
      </>
    );

    if (field.type === 'boolean') {
      return (
        <Controller
          control={control}
          name={field.env_variable}
          defaultValue={field.default}
          render={({ field: { onChange, value, ref, ...props } }) => <Switch className="mb-3" ref={ref} checked={Boolean(value)} onCheckedChange={onChange} {...props} label={label} />}
        />
      );
    }

    if (Array.isArray(field.options)) {
      return (
        <Controller
          control={control}
          name={field.env_variable}
          defaultValue={field.default}
          render={({ field: { onChange, value, ref, ...props } }) => (
            <Select value={value as string} defaultValue={field.default as string} onValueChange={onChange} {...props}>
              <SelectTrigger className="mb-3" error={errors[field.env_variable]?.message} label={label}>
                <SelectValue placeholder="Choose an option..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      );
    }

    return <Input key={field.env_variable} {...register(field.env_variable)} label={label} error={errors[field.env_variable]?.message} disabled={loading} className="mb-3" placeholder={field.label} />;
  };

  const renderExposeForm = () => (
    <>
      <Controller
        control={control}
        name="exposed"
        defaultValue={false}
        render={({ field: { onChange, value, ref, ...props } }) => <Switch className="mb-3" ref={ref} checked={value} onCheckedChange={onChange} {...props} label="Expose app" />}
      />
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

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(validate)}>
      {formFields.filter(typeFilter).map(renderField)}
      {exposable && renderExposeForm()}
      <Button loading={loading} type="submit" className="btn-success">
        {initalValues ? 'Update' : 'Install'}
      </Button>
    </form>
  );
};
