import { updateUserSettingsMutation } from '@/api-client/@tanstack/react-query.gen';
import { useAppContext } from '@/context/app-context';
import { getCurrentLocale, getLocaleFromString } from '@/lib/i18n/locales';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { type SettingsFormValues, UserSettingsForm } from '../components/user-settings-form/user-settings-form';
import { useState } from 'react';

type Props = {
  initialValues?: SettingsFormValues;
};

export const UserSettingsContainer = ({ initialValues }: Props) => {
  const currentLocale = getCurrentLocale();
  const { t } = useTranslation();
  const { refreshAppContext } = useAppContext();
  const [requireRestart, setRequireRestart] = useState(initialValues?.advancedSettings);

  const updateSettings = useMutation({
    ...updateUserSettingsMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onSuccess: () => {
      toast.success(requireRestart ? t('SETTINGS_GENERAL_SETTINGS_UPDATED_RESTART') : t('SETTINGS_GENERAL_SETTINGS_UPDATED'));
      refreshAppContext();
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    if (values.advancedSettings) {
      setRequireRestart(true);
    } else {
      setRequireRestart(false);
    }
    updateSettings.mutate({ body: { ...values }});
  }

  return (
    <div className="card-body">
      <UserSettingsForm
        initialValues={initialValues}
        currentLocale={getLocaleFromString(currentLocale)}
        loading={updateSettings.isPending}
        onSubmit={onSubmit}
      />
    </div>
  );
};
