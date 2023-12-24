import { IconDownload } from '@tabler/icons-react';
import React from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';
import { UpdateModal } from 'src/app/(dashboard)/app-store/[id]/components/UpdateModal/';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { AppService } from '@/server/services/apps/apps.service';
import { useAction } from 'next-safe-action/hook';
import { updateAppAction } from '@/actions/app-actions/update-app-action';

type UpdateAllButtonProps = {
  apps: Awaited<ReturnType<AppService['getApp']>>[];
}

export const UpdateAllButton: React.FC<UpdateAllButtonProps> = ({apps}) => {

  const updateDisclosure = useDisclosure();

  const updateMutation = useAction(updateAppAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onExecute: () => {
      updateDisclosure.close();
      // setOptimisticStatus('updating');
    },
  });

  const openModal = () => {
    updateDisclosure.open();
  }

  const updateAll = () => {
    apps.forEach((app) => {
      updateMutation.execute({ id: app.id });
    })
  }

  return (
    <>
      <UpdateModal
        onConfirm={() => updateAll()}
        isOpen={updateDisclosure.isOpen}
        onClose={updateDisclosure.close}
        info={null}
        newVersion={null} />
      <div className='d-flex justify-content-end'>
        <Button className={clsx('me-2 px-4 mt-2', [`btn-green`])} onClick={openModal}>
          Update all
          {IconDownload && <IconDownload className='ms-1' size={18} />}
        </Button>
      </div>
    </>
  )
}