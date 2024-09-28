import { restartAction } from '@/actions/settings/restart-action';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import toast from 'react-hot-toast';

export const RestartModal = () => {
  const t = useTranslations();
  const restartDisclosure = useDisclosure();

  const restartMutation = useAction(restartAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onSettled: () => {
      restartDisclosure.close();
    },
  });

  return (
    <div>
      <Button onClick={() => restartDisclosure.open()}>{t('SETTINGS_ACTIONS_RESTART')}</Button>
      <Dialog open={restartDisclosure.isOpen} onOpenChange={restartDisclosure.toggle}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_ACTIONS_RESTART')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <span className="text-muted">{t('SETTINGS_ACTIONS_RESTART_SUBTITLE')}</span>
          </DialogDescription>
          <DialogFooter>
            <Button intent="danger" loading={restartMutation.isExecuting} onClick={() => restartMutation.execute()}>
              {t('SETTINGS_ACTIONS_RESTART')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
