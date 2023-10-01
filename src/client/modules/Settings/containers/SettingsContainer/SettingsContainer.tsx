'use client';

import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { toast } from 'react-hot-toast';
import { MessageKey } from '@/server/utils/errors';
import { useTranslations } from 'next-intl';
import { SettingsForm, SettingsFormValues } from '../../components/SettingsForm';

export const SettingsContainer = () => {
  const t = useTranslations();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const getSettings = trpc.system.getSettings.useQuery();
  const updateSettings = trpc.system.updateSettings.useMutation({
    onSuccess: () => {
      toast.success(t('settings.settings.settings-updated'));
    },
    onError: (e) => {
      if (e.shape?.data.zodError) {
        setErrors(e.shape.data.zodError);
      }

      toast.error(t(e.data?.tError.message as MessageKey, { ...e.data?.tError?.variables }));
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
