import { restartAction } from '@/actions/settings/restart';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import toast from 'react-hot-toast';

// fuck

export const RestartModal = () => {
  const t = useTranslations();
  const restartDisclosure = useDisclosure();

  const restartMutation = useAction(restartAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onSuccess: () => {
      restartDisclosure.toggle();
    },
  });

  const onSubmit = () => {
    restartMutation.execute();
  };

  return (
    <div>
      <Button onClick={restartDisclosure.open}>Restart</Button>
      <Dialog open={restartDisclosure.isOpen} onOpenChange={restartDisclosure.toggle}>
        <DialogContent size="sm" type="danger">
          <DialogHeader>
            <DialogTitle>Restart Runtipi?</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <p className="text-muted">Runtipi is going to restart now, please do not close the web page.</p>
            <div className="mt-3 d-flex justify-content-end">
              <Button disabled={restartMutation.status === 'executing'} onClick={restartDisclosure.close}>
                Cancel
              </Button>
              <Button className="btn btn-danger ms-2" loading={restartMutation.status === 'executing'} onClick={onSubmit}>
                Restart
              </Button>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
};
