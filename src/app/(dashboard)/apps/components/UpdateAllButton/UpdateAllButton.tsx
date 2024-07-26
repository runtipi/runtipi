'use client';

import React from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { useAction } from 'next-safe-action/hooks';
import { updateAllAppsAction } from '@/actions/app-actions/update-all-apps-action';
import { useTranslations } from 'next-intl';
import { UpdateAllModal } from '../UpdateAllModal';

export const UpdateAllButton: React.FC = () => {
  const updateDisclosure = useDisclosure();
  const t = useTranslations();

  const updateAllMutation = useAction(updateAllAppsAction, {
    onSuccess: () => {
      toast.loading(t('MY_APPS_UPDATE_ALL_IN_PROGRESS'), { duration: 3000 });
    },
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onExecute: () => {
      updateDisclosure.close();
    },
  });

  return (
    <div className="d-flex align-items-end align-items-md-center flex-column flex-md-row justify-content-end">
      <UpdateAllModal isOpen={updateDisclosure.isOpen} onClose={() => updateDisclosure.close()} onConfirm={() => updateAllMutation.execute()} />
      <Button intent="success" onClick={updateDisclosure.open}>
        Update all
      </Button>
    </div>
  );
};
