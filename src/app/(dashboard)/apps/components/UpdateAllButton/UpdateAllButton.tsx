import { IconDownload } from '@tabler/icons-react';
import React from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';
import { UpdateModal } from 'src/app/(dashboard)/app-store/[id]/components/UpdateModal/';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { useAction } from 'next-safe-action/hook';
import { updateAllAppsAction } from '@/actions/app-actions/update-app-action';

export const UpdateAllButton: React.FC = () => {

  const updateDisclosure = useDisclosure();

  const updateAllMutation = useAction(updateAllAppsAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onExecute: () => {
      updateDisclosure.close();
    },
  });

  const openModal = () => {
    updateDisclosure.open();
  }

  const updateAll = () => {
    updateAllMutation.execute();
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