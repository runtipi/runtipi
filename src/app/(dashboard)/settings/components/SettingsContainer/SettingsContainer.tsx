'use client';

import React from 'react';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hook';
import { updateSettingsAction } from '@/actions/settings/update-settings';
import { Locale } from '@/shared/internationalization/locales';
import { SettingsForm, SettingsFormValues } from '../SettingsForm';

type Props = {
  initialValues?: SettingsFormValues;
  currentLocale: Locale;
};

export const SettingsContainer = ({ initialValues, currentLocale }: Props) => {
  const t = useTranslations();

  const updateSettingsMutation = useAction(updateSettingsAction, {
    onSuccess: (data) => {
      if (!data.success) {
        toast.error(data.failure.reason);
      } else {
        toast.success(t('settings.settings.settings-updated'));
      }
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    updateSettingsMutation.execute(values);
  };

  return (
    <div className="card-body">
      <SettingsForm initalValues={initialValues} currentLocale={currentLocale} loading={updateSettingsMutation.isExecuting} onSubmit={onSubmit} />
    </div>
  );
};
