import { deleteAppStoreAction } from '@/actions/settings/delete-app-store';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export const DeleteAppStoreDialog = ({ appstore }: { appstore: string }) => {
  const t = useTranslations();

  const deleteAppStoreDisclosure = useDisclosure();

  const router = useRouter();

  const deleteAppStoreMutation = useAction(deleteAppStoreAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onSuccess: () => {
      toast.success(t('SETTINGS_APP_STORE_DELETE_SUCCESS'));
      router.refresh();
    },
  });

  return (
    <>
      <Button className="btn-danger mx-1" onClick={() => deleteAppStoreDisclosure.open()}>
        {t('SETTINGS_APP_STORE_DELETE_BUTTON')}
      </Button>
      <Dialog open={deleteAppStoreDisclosure.isOpen} onOpenChange={deleteAppStoreDisclosure.toggle}>
        <DialogContent type="danger" size="sm">
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_APP_STORE_DELETE_MODAL_TITLE')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <p className="text-muted">{t('SETTINGS_APP_STORE_DELETE_MODAL_DESCRIPTION')}</p>
            <Button
              onClick={() => deleteAppStoreMutation.execute({ appStoreUrl: appstore })}
              loading={deleteAppStoreMutation.status === 'executing'}
              className="btn-danger me-2"
            >
              {t('SETTINGS_APP_STORE_DELETE_BUTTON')}
            </Button>
            <Button onClick={() => deleteAppStoreDisclosure.close()}>{t('SETTINGS_APP_STORE_CANCEL_BUTTON')}</Button>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};
