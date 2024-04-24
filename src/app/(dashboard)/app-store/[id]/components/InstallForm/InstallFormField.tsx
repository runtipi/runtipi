import React from 'react';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { FormField } from '@runtipi/shared';
import { Tooltip } from 'react-tooltip';
import clsx from 'clsx';
import { Control, Controller, UseFormRegister } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { FormValues } from './InstallForm.types';

type IProps = {
  field: FormField;
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  initialValue?: string;
  loading?: boolean;
  error?: string;
};

/**
 * This component is used to render a single form field in the install form.
 * It will render the correct input type based on the field type and will handle
 * validation and error messages.
 */
export const InstallFormField = (props: IProps) => {
  const { field, control, register, initialValue, error, loading } = props;
  const t = useTranslations();

  const label = (
    <>
      {field.label}
      {field.required && <span className="ms-1 text-danger">*</span>}
      {Boolean(field.hint) && (
        <>
          <Tooltip className="tooltip" anchorSelect={`.${field.env_variable}`}>
            {field.hint}
          </Tooltip>
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
        render={({ field: { onChange, value, ref, ...rest } }) => (
          <Switch className="mb-3" ref={ref} checked={Boolean(value)} onCheckedChange={onChange} {...rest} label={label} />
        )}
      />
    );
  }

  if (Array.isArray(field.options)) {
    return (
      <Controller
        control={control}
        name={field.env_variable}
        defaultValue={field.default}
        render={({ field: { onChange, value, ref, ...rest } }) => (
          <Select value={value as string} defaultValue={initialValue} onValueChange={onChange} {...rest}>
            <SelectTrigger className="mb-3" error={error} label={label}>
              <SelectValue placeholder={t('APP_INSTALL_FORM_CHOOSE_OPTION')} />
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

  let type;

  switch (field.type) {
    case 'password':
      type = 'password' as const;
      break;
    case 'number':
      type = 'number' as const;
      break;
    case 'email':
      type = 'email' as const;
      break;
    case 'url':
      type = 'url' as const;
      break;
    default:
      type = 'text' as const;
      break;
  }

  return (
    <Input
      key={field.env_variable}
      {...register(field.env_variable)}
      label={label}
      error={error}
      disabled={loading}
      type={type}
      className="mb-3"
      placeholder={field.placeholder || field.label}
    />
  );
};
