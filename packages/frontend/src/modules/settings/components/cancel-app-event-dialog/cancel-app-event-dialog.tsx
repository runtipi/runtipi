import { cancelAppEventMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const CancelAppEventDialog = ({ id }: { id: string }) => {
  const { t } = useTranslation();
  const cancelAppEventDisclosure = useDisclosure();

  const cancelAppEvent = useMutation({
    ...cancelAppEventMutation(),
    onSuccess: () => {
      cancelAppEventDisclosure.close();
      toast.success(t('SETTINGS_EVENTS_CANCEL_SUCCESS'));
    },
    onError: () => {
      toast.error(t('SETTINGS_EVENTS_CANCEL_FAILURE'));
    },
  });

  return (
    <>
      <Button variant="ghost" intent="danger" onClick={() => cancelAppEventDisclosure.open()}>
        {t('ACTIONS_CANCEL')}
      </Button>
      <Dialog open={cancelAppEventDisclosure.isOpen} onOpenChange={cancelAppEventDisclosure.toggle}>
        <DialogContent size="sm" type="danger">
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_EVENTS_CANCEL_DIALOG_TITLE')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <span className="text-muted">{t('SETTINGS_EVENTS_CANCEL_DIALOG_SUBTITLE', { id })}</span>
          </DialogDescription>
          <DialogFooter>
            <Button loading={cancelAppEvent.isPending} onClick={() => cancelAppEventDisclosure.close()}>
              {t('SETTINGS_EVENTS_CANCEL_DIALOG_KEEP_RUNNING')}
            </Button>
            <Button intent="danger" loading={cancelAppEvent.isPending} onClick={() => cancelAppEvent.mutate({ path: { requestId: id } })}>
              {t('SETTINGS_EVENTS_CANCEL_DIALOG_SUBMIT')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
