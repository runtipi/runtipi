import { updateRepoAction } from '@/actions/settings/update-repo-action';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { DialogDescription } from '@radix-ui/react-dialog';
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
  });

  return (
    <div className="mt-2">
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
            <Button loading={updateRepoMutation.isExecuting} onClick={() => updateRepoMutation.execute()}>
              {t('SETTINGS_ACTIONS_UPDATE_REPO_MODAL_BUTTON')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
