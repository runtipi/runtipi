import { deleteProviderMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { DropdownMenuItem } from '@/components/ui/DropdownMenu';

interface DeleteProviderDialogProps {
  providerId: number;
  providerName: string;
}

export const DeleteOAuthProviderDialog = ({ providerId, providerName }: DeleteProviderDialogProps) => {
  const { t } = useTranslation();

  const deleteProviderDialogDisclosure = useDisclosure();

  const deleteMutation = useMutation({
    ...deleteProviderMutation(),
    onSuccess: () => {
      toast.success(t('SETTINGS_SECURITY_OAUTH_DELETE_SUCCESS'));
      deleteProviderDialogDisclosure.close();
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  return (
    <>
      <DropdownMenuItem onClick={() => deleteProviderDialogDisclosure.open()} onSelect={(e) => e.preventDefault()} className="text-danger">
        {t('DELETE')}
      </DropdownMenuItem>
      <Dialog open={deleteProviderDialogDisclosure.isOpen} onOpenChange={deleteProviderDialogDisclosure.toggle}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_SECURITY_OAUTH_DELETE_TITLE', { provider: providerName })}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <p className="text-muted">{t('SETTINGS_SECURITY_OAUTH_DELETE_SUBTITLE')}</p>
          </DialogDescription>
          <DialogFooter>
            <Button onClick={() => deleteProviderDialogDisclosure.close()} variant="outline" intent="dark">
              {t('ACTIONS_CANCEL')}
            </Button>
            <Button onClick={() => deleteMutation.mutate({ path: { id: providerId } })} intent="danger">
              {t('DELETE')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
