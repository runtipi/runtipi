import { deleteAppStoreMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { AppStore } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

type Props = {
  appStore: AppStore;
};

export const DeleteAppStoreDialog = ({ appStore }: Props) => {
  const { t } = useTranslation();
  const deleteAppStoreDisclosure = useDisclosure();

  const deleteAppStore = useMutation({
    ...deleteAppStoreMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onSuccess: () => {
      toast.success(t('APP_STORE_DELETE_SUCCESS'));
      deleteAppStoreDisclosure.close();
    },
  });

  return (
    <div>
      <Button size="sm" intent="danger" variant="ghost" disabled={deleteAppStore.isPending} onClick={() => deleteAppStoreDisclosure.open()}>
        {t('APP_STORE_TABLE_DELETE')}
      </Button>
      <Dialog open={deleteAppStoreDisclosure.isOpen} onOpenChange={deleteAppStoreDisclosure.toggle}>
        <DialogContent type="danger" size="sm">
          <DialogHeader>
            <DialogTitle>{t('APP_STORE_DELETE_DIALOG_TITLE')}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-center py-4">
            <IconAlertTriangle className="icon mb-2 text-danger icon-lg" />
            <h3 className="text-muted">{t('APP_STORE_DELETE_DIALOG_WARNING', { name: appStore.name })}</h3>
          </DialogDescription>
          <DialogFooter>
            <Button
              loading={deleteAppStore.isPending}
              intent="danger"
              onClick={() => deleteAppStore.mutate({ path: { id: appStore.id.toString() } })}
            >
              {t('APP_STORE_DELETE_DIALOG_SUBMIT')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
