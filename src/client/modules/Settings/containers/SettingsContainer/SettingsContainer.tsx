import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { useToastStore } from '../../../../state/toastStore';
import { SettingsForm, SettingsFormValues } from '../../components/SettingsForm';

export const SettingsContainer = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { addToast } = useToastStore();
  const getSettings = trpc.system.getSettings.useQuery();
  const updateSettings = trpc.system.updateSettings.useMutation({
    onSuccess: () => {
      addToast({ title: 'Settings updated', description: 'Restart your instance for settings to take effect', status: 'success' });
    },
    onError: (e) => {
      if (e.shape?.data.zodError) {
        setErrors(e.shape.data.zodError);
      }

      addToast({ title: 'Error saving settings', description: e.message, status: 'error' });
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    updateSettings.mutate(values);
  };

  return (
    <div className="card-body">
      <SettingsForm submitErrors={errors} initalValues={getSettings.data} loading={updateSettings.isLoading} onSubmit={onSubmit} />
    </div>
  );
};
