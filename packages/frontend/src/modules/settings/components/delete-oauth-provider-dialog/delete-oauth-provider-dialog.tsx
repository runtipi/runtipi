import { deleteProviderMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

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
      toast.success('Provider deleted successfully');
      deleteProviderDialogDisclosure.close();
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  return (
    <>
      <Button size="sm" onClick={() => deleteProviderDialogDisclosure.open()} intent="danger">
        Delete
      </Button>
      <Dialog open={deleteProviderDialogDisclosure.isOpen} onOpenChange={deleteProviderDialogDisclosure.toggle}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete {providerName}?</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <p className="text-muted">Are you sure you want to delete this provider? You will not be able to login again using this provider.</p>
          </DialogDescription>
          <DialogFooter>
            <Button onClick={() => deleteProviderDialogDisclosure.close()} variant="outline" intent="dark">
              Cancel
            </Button>
            <Button onClick={() => deleteMutation.mutate({ path: { id: providerId } })} intent="danger">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
