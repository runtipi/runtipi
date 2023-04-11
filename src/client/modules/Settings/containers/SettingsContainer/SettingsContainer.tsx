import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { toast } from 'react-hot-toast';
import { SettingsForm, SettingsFormValues } from '../../components/SettingsForm';

export const SettingsContainer = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const getSettings = trpc.system.getSettings.useQuery();
  const updateSettings = trpc.system.updateSettings.useMutation({
    onSuccess: () => {
      toast.success('Settings updated. Restart your instance to apply new settings.');
    },
    onError: (e) => {
      if (e.shape?.data.zodError) {
        setErrors(e.shape.data.zodError);
      }

      toast.error(`Error saving settings: ${e.message}`);
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
