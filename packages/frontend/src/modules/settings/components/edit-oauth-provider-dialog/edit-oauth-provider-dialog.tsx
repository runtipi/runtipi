import type { GetProviderAuthUrlResponse, GetProvidersPrivateResponse } from '@/api-client';
import { editProviderMutation, getProviderAuthUrlMutation } from '@/api-client/@tanstack/react-query.gen';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useId, useState } from 'react';
import toast from 'react-hot-toast';
import type { TranslatableError } from '@/types/error.types';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { OAuthForm } from '../oauth-form/oauth-form';

interface EditOAuthProviderDialogProps {
  provider: GetProvidersPrivateResponse['providers'][number];
}

export const EditOAuthProviderDialog = ({ provider }: EditOAuthProviderDialogProps) => {
  const { t } = useTranslation();
  const [edited, setEdited] = useState(false);

  const editProvider = useMutation({
    ...editProviderMutation(),
    onSuccess: () => {
      toast.success('Provider updated successfully');
      setEdited(true);
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const getProviderUrl = useMutation({
    ...getProviderAuthUrlMutation(),
    onSuccess: (res: GetProviderAuthUrlResponse) => {
      toast.success('Redirecting to your provider');
      setTimeout(() => {
        window.location.href = res.url;
      }, 500);
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const editProviderDialogDisclosure = useDisclosure();
  const formId = useId();

  return (
    <>
      <Button size="sm" onClick={() => editProviderDialogDisclosure.open()} className="me-1" intent="primary">
        Edit
      </Button>
      <Dialog open={editProviderDialogDisclosure.isOpen} onOpenChange={editProviderDialogDisclosure.toggle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editing {provider.name}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <ScrollArea maxheight={500}>
              {edited ? (
                <p className="text-muted">After making changes, it's recommended to authenticate again to ensure everything is up to date.</p>
              ) : (
                <>
                  <p className="text-muted mb-3">You can edit the provider details below.</p>
                  <OAuthForm
                    onSubmit={(values) => editProvider.mutate({ path: { id: provider.id! }, body: values })}
                    formId={formId}
                    isLoading={editProvider.isPending}
                    initialValues={provider}
                  />
                </>
              )}
            </ScrollArea>
          </DialogDescription>
          <DialogFooter>
            <Button
              intent="dark"
              variant="outline"
              onClick={() => editProviderDialogDisclosure.close()}
              disabled={editProvider.isPending || getProviderUrl.isPending}
            >
              {edited ? 'Close' : 'Cancel'}
            </Button>
            {edited ? (
              <Button intent="primary" onClick={() => getProviderUrl.mutate({ path: { id: provider.id! } })} disabled={getProviderUrl.isPending}>
                Authorize
              </Button>
            ) : (
              <Button intent="primary" type="submit" form={formId} disabled={editProvider.isPending}>
                Update
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
