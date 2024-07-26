'use client';

import React from 'react';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { updateSettingsAction } from '@/actions/settings/update-settings';
import { Locale } from '@/shared/internationalization/locales';
import { useRouter } from 'next/navigation';
import { SettingsForm, SettingsFormValues } from '../SettingsForm';

type Props = {
  initialValues?: SettingsFormValues;
  currentLocale: Locale;
};

export const SettingsContainer = ({ initialValues, currentLocale }: Props) => {
  const t = useTranslations();

  const router = useRouter();

  const updateSettingsMutation = useAction(updateSettingsAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onSuccess: () => {
      toast.success(t('SETTINGS_GENERAL_SETTINGS_UPDATED'));
      router.refresh();
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    updateSettingsMutation.execute(values);
  };

  return (
    <div className="card-body">
      <SettingsForm
        initalValues={initialValues}
        currentLocale={currentLocale}
        loading={updateSettingsMutation.status === 'executing'}
        onSubmit={onSubmit}
      />
    </div>
  );
};
