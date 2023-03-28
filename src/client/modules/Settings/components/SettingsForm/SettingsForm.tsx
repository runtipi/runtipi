import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import validator from 'validator';

export type SettingsFormValues = {
  dnsIp?: string;
  internalIp?: string;
  appsRepoUrl?: string;
  domain?: string;
  storagePath?: string;
};

interface IProps {
  onSubmit: (values: SettingsFormValues) => void;
  initalValues?: Partial<SettingsFormValues>;
  loading?: boolean;
  submitErrors?: Record<string, string>;
}

const validateFields = (values: SettingsFormValues) => {
  const errors: { [K in keyof SettingsFormValues]?: string } = {};

  if (values.dnsIp && !validator.isIP(values.dnsIp)) {
    errors.dnsIp = 'Invalid IP address';
  }

  if (values.internalIp && values.internalIp !== 'localhost' && !validator.isIP(values.internalIp)) {
    errors.internalIp = 'Invalid IP address';
  }

  if (values.appsRepoUrl && !validator.isURL(values.appsRepoUrl)) {
    errors.appsRepoUrl = 'Invalid URL';
  }

  if (values.domain && !validator.isFQDN(values.domain)) {
    errors.domain = 'Invalid domain';
  }

  return errors;
};

export const SettingsForm = (props: IProps) => {
  const { onSubmit, initalValues, loading, submitErrors } = props;

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>();

  useEffect(() => {
    if (initalValues && !isDirty) {
      Object.entries(initalValues).forEach(([key, value]) => {
        setValue(key as keyof SettingsFormValues, value);
      });
    }
  }, [initalValues, isDirty, setValue]);

  useEffect(() => {
    if (submitErrors) {
      Object.entries(submitErrors).forEach(([key, value]) => {
        setError(key as keyof SettingsFormValues, { message: value });
      });
    }
  }, [submitErrors, setError]);

  const validate = (values: SettingsFormValues) => {
    const validationErrors = validateFields(values);

    Object.entries(validationErrors).forEach(([key, value]) => {
      if (value) {
        setError(key as keyof SettingsFormValues, { message: value });
      }
    });

    if (Object.keys(validationErrors).length === 0) {
      onSubmit(values);
    }
  };

  return (
    <form data-testid="settings-form" className="flex flex-col" onSubmit={handleSubmit(validate)}>
      <h2 className="text-2xl font-bold">General settings</h2>
      <p className="mb-4">This will update your settings.json file. Make sure you know what you are doing before updating these values.</p>
      <div className="mb-3">
        <Input {...register('domain')} label="Domain name" error={errors.domain?.message} placeholder="tipi.localhost" />
        <span className="text-muted">
          Make sure this domain contains a <strong>A</strong> record pointing to your IP.
        </span>
      </div>
      <div className="mb-3">
        <Input {...register('dnsIp')} label="DNS IP" error={errors.dnsIp?.message} placeholder="9.9.9.9" />
      </div>
      <div className="mb-3">
        <Input {...register('internalIp')} label="Internal IP" error={errors.internalIp?.message} placeholder="192.168.1.100" />
        <span className="text-muted">IP address your server is listening on. Keep localhost for default</span>
      </div>
      <div className="mb-3">
        <Input {...register('appsRepoUrl')} label="Apps repo URL" error={errors.appsRepoUrl?.message} placeholder="https://github.com/meienberger/runtipi-appstore" />
        <span className="text-muted">URL to the apps repository.</span>
      </div>
      <div className="mb-3">
        <Input {...register('storagePath')} label="Storage path" error={errors.storagePath?.message} placeholder="Storage path" />
        <span className="text-muted">Path to the storage directory. Keep empty for default</span>
      </div>
      <Button loading={loading} type="submit" className="btn-success">
        Save
      </Button>
    </form>
  );
};
