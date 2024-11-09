import { pullRepoMutatuion } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const UpdateRepoModal = () => {
  const UpdateRepoModalDisclosure = useDisclosure();
  const { t } = useTranslation();

  const updateRepo = useMutation({
    ...pullRepoMutatuion(),
    onSuccess: () => {
      toast.success(t('SETTINGS_ACTIONS_UPDATE_REPO_SUCCESS'));
      UpdateRepoModalDisclosure.close();
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  return (
    <div>
      <Button onClick={() => UpdateRepoModalDisclosure.open()}>{t('SETTINGS_ACTIONS_UPDATE_REPO_MODAL_BUTTON')}</Button>
      <Dialog open={UpdateRepoModalDisclosure.isOpen} onOpenChange={UpdateRepoModalDisclosure.toggle}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_ACTIONS_UPDATE_REPO_TITLE')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <span className="text-muted">{t('SETTINGS_ACTIONS_UPDATE_REPO_MODAL_SUBTITLE')}</span>
          </DialogDescription>
          <DialogFooter>
            <Button intent="success" loading={updateRepo.isPending} onClick={() => updateRepo.mutate({})}>
              {t('SETTINGS_ACTIONS_UPDATE_REPO_MODAL_BUTTON')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
