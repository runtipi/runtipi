import { LanguageSelector } from '@/components/LanguageSelector';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { IconAdjustmentsAlt, IconUser } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
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

export const SettingsForm = (props: IProps) => {
  const { onSubmit, initalValues, loading, submitErrors } = props;
  const t = useTranslations('settings.settings');

  const validateFields = (values: SettingsFormValues) => {
    const errors: { [K in keyof SettingsFormValues]?: string } = {};

    if (values.dnsIp && !validator.isIP(values.dnsIp)) {
      errors.dnsIp = t('invalid-ip');
    }

    if (values.internalIp && values.internalIp !== 'localhost' && !validator.isIP(values.internalIp)) {
      errors.internalIp = t('invalid-ip');
    }

    if (values.appsRepoUrl && !validator.isURL(values.appsRepoUrl)) {
      errors.appsRepoUrl = t('invalid-url');
    }

    if (values.domain && !validator.isFQDN(values.domain)) {
      errors.domain = t('invalid-domain');
    }

    return errors;
  };

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
    <>
      <div className="d-flex">
        <IconUser className="me-2" />
        <h2 className="text-2xl font-bold">{t('user-settings-title')}</h2>
      </div>
      <LanguageSelector />
      <form className="flex flex-col mt-2" onSubmit={handleSubmit(validate)}>
        <div className="d-flex">
          <IconAdjustmentsAlt className="me-2" />
          <h2 className="text-2xl font-bold">{t('title')}</h2>
        </div>
        <p className="mb-4">{t('subtitle')}</p>
        <div className="mb-3">
          <Input {...register('domain')} label={t('domain-name')} error={errors.domain?.message} placeholder="tipi.localhost" />
          <span className="text-muted">{t('domain-name-hint')}</span>
        </div>
        <div className="mb-3">
          <Input {...register('dnsIp')} label={t('dns-ip')} error={errors.dnsIp?.message} placeholder="9.9.9.9" />
        </div>
        <div className="mb-3">
          <Input {...register('internalIp')} label={t('internal-ip')} error={errors.internalIp?.message} placeholder="192.168.1.100" />
          <span className="text-muted">{t('internal-ip-hint')}</span>
        </div>
        <div className="mb-3">
          <Input {...register('appsRepoUrl')} label={t('apps-repo')} error={errors.appsRepoUrl?.message} placeholder="https://github.com/meienberger/runtipi-appstore" />
          <span className="text-muted">{t('apps-repo-hint')}</span>
        </div>
        <div className="mb-3">
          <Input {...register('storagePath')} label={t('storage-path')} error={errors.storagePath?.message} placeholder="Storage path" />
          <span className="text-muted">{t('storage-path-hint')}</span>
        </div>
        <Button loading={loading} type="submit" className="btn-success">
          {t('submit')}
        </Button>
      </form>
    </>
  );
};
