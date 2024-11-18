import { updateAllAppsMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const UpdateAllDialog = ({ isOpen, onClose, onConfirm }: Props) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('MY_APPS_UPDATE_ALL_FORM_TITLE')}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <div className="text-muted">
            {t('MY_APPS_UPDATE_ALL_FORM_SUBTITLE_1')}
            <br />
            <br />
            {t('MY_APPS_UPDATE_ALL_FORM_SUBTITLE_2')}
          </div>
        </DialogDescription>
        <DialogFooter>
          <Button onClick={onConfirm} intent="success">
            {t('MY_APPS_UPDATE_ALL_FORM_SUBMIT')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const UpdateAllButton = () => {
  const updateDisclosure = useDisclosure();
  const { t } = useTranslation();

  const updateAll = useMutation({
    ...updateAllAppsMutation(),
    onMutate: () => {
      updateDisclosure.close();
    },
    onSuccess: () => {
      toast.loading(t('MY_APPS_UPDATE_ALL_IN_PROGRESS'), { duration: 3000 });
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  return (
    <div className="d-flex align-items-end align-items-md-center flex-column flex-md-row justify-content-end">
      <UpdateAllDialog isOpen={updateDisclosure.isOpen} onClose={() => updateDisclosure.close()} onConfirm={() => updateAll.mutate({})} />
      <Button intent="success" onClick={updateDisclosure.open}>
        {t('MY_APPS_UPDATE_ALL_FORM_SUBMIT')}
      </Button>
    </div>
  );
};
