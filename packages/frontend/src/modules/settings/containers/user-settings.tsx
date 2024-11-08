import { updateUserSettingsMutation } from '@/api-client/@tanstack/react-query.gen';
import { useAppContext } from '@/context/app-context';
import { getLocaleFromString } from '@/lib/i18n/locales';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { type SettingsFormValues, UserSettingsForm } from '../components/user-settings-form/user-settings-form';

type Props = {
  initialValues?: SettingsFormValues;
};

export const UserSettingsContainer = ({ initialValues }: Props) => {
  const currentLocale = Cookies.get('tipi-locale') || 'en-US';
  const { t } = useTranslation();
  const { refreshAppContext } = useAppContext();

  const updateSettings = useMutation({
    ...updateUserSettingsMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onSuccess: () => {
      toast.success(t('SETTINGS_GENERAL_SETTINGS_UPDATED'));
      refreshAppContext();
    },
  });

  return (
    <div className="card-body">
      <UserSettingsForm
        initialValues={initialValues}
        currentLocale={getLocaleFromString(currentLocale)}
        loading={updateSettings.isPending}
        onSubmit={(values) => updateSettings.mutate({ body: { ...values } })}
      />
    </div>
  );
};
