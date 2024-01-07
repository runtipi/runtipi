'use client';

import React from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { useAction } from 'next-safe-action/hook';
import { updateAllAppsAction } from '@/actions/app-actions/update-all-apps-action';
import { useTranslations } from 'next-intl';
import { UpdateAllModal } from '../UpdateAllModal';

export const UpdateAllButton: React.FC = () => {
  const updateDisclosure = useDisclosure();
  const t = useTranslations('apps.my-apps.update-all-form');

  const updateAllMutation = useAction(updateAllAppsAction, {
    onSuccess: () => {
      toast.loading(t('in-progress'), { duration: 3000 });
    },
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onExecute: () => {
      updateDisclosure.close();
    },
  });

  return (
    <div className="d-flex align-items-stretch align-items-md-center flex-column flex-md-row justify-content-end">
      <UpdateAllModal isOpen={updateDisclosure.isOpen} onClose={() => updateDisclosure.close()} onConfirm={() => updateAllMutation.execute()} />
      <Button onClick={updateDisclosure.open}>Update all</Button>
    </div>
  );
};
