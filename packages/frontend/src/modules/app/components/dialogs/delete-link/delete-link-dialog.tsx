import { deleteLinkMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import type React from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

type DeleteLinkDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  linkId: number;
  linkTitle: string;
};

export const DeleteLinkDialog: React.FC<DeleteLinkDialogProps> = ({ isOpen, onClose, linkTitle, linkId }) => {
  const { t } = useTranslation();

  const deleteLink = useMutation({
    ...deleteLinkMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onSuccess: () => {
      onClose();
      toast.success(t('LINKS_DELETE_SUCCESS'));
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>
            {t('LINKS_DELETE_TITLE')} {linkTitle}?
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <div className="text-muted">{t('LINKS_DELETE_SUBTITLE')}</div>
        </DialogDescription>
        <DialogFooter>
          <Button intent="danger" onClick={() => deleteLink.mutate({ path: { id: linkId } })}>
            {t('LINKS_DELETE_SUBMIT')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
