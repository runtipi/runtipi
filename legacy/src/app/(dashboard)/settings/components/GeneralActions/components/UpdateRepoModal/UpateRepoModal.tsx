import { updateRepoAction } from '@/actions/settings/update-repo-action';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import toast from 'react-hot-toast';

export const UpdateRepoModal = () => {
  const t = useTranslations();
  const updateRepoDisclosure = useDisclosure();

  const updateRepoMutation = useAction(updateRepoAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onSuccess: () => {
      toast.success(t('SETTINGS_ACTIONS_UPDATE_REPO_SUCCESS'));
    },
    onSettled: () => {
      updateRepoDisclosure.close();
    },
  });

  return (
    <div>
      <Button onClick={() => updateRepoDisclosure.open()}>{t('SETTINGS_ACTIONS_UPDATE_REPO_MODAL_BUTTON')}</Button>
      <Dialog open={updateRepoDisclosure.isOpen} onOpenChange={updateRepoDisclosure.toggle}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_ACTIONS_UPDATE_REPO_TITLE')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <span className="text-muted">{t('SETTINGS_ACTIONS_UPDATE_REPO_MODAL_SUBTITLE')}</span>
          </DialogDescription>
          <DialogFooter>
            <Button intent="success" loading={updateRepoMutation.isExecuting} onClick={() => updateRepoMutation.execute()}>
              {t('SETTINGS_ACTIONS_UPDATE_REPO_MODAL_BUTTON')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
