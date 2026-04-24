import { updateUserSettingsMutation } from '@/api-client/@tanstack/react-query.gen';
import { useAppContext } from '@/context/app-context';
import { useUserContext } from '@/context/user-context';
import type { Locale } from '@/lib/i18n/locales';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import i18next from 'i18next';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { type SettingsFormValues, UserSettingsForm } from '../components/user-settings-form/user-settings-form';

type Props = {
  initialValues?: SettingsFormValues;
};

export const UserSettingsContainer = ({ initialValues }: Props) => {
  const currentLocale = i18next.language;
  const { t } = useTranslation();
  const { refreshAppContext } = useAppContext();
  const { refreshUserContext, setUserContext } = useUserContext();
  const [requireRestart, setRequireRestart] = useState(initialValues?.advancedSettings);

  const updateSettings = useMutation({
    ...updateUserSettingsMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
      refreshUserContext();
    },
    onSuccess: (_data, variables) => {
      toast.success(requireRestart ? t('SETTINGS_GENERAL_SETTINGS_UPDATED_RESTART') : t('SETTINGS_GENERAL_SETTINGS_UPDATED'));
      if (typeof variables.body.guestDashboard === 'boolean') {
        setUserContext({ isGuestDashboardEnabled: variables.body.guestDashboard });
      }
      refreshAppContext();
      refreshUserContext();
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    if (values.advancedSettings) {
      setRequireRestart(true);
    } else {
      setRequireRestart(false);
    }
    if (typeof values.guestDashboard === 'boolean') {
      setUserContext({ isGuestDashboardEnabled: values.guestDashboard });
    }
    updateSettings.mutate({ body: { ...values } });
  };

  return (
    <div className="card-body">
      <UserSettingsForm
        initialValues={initialValues}
        currentLocale={currentLocale as Locale}
        onSubmit={onSubmit}
        loading={updateSettings.isPending}
      />
    </div>
  );
};
