import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { createProviderMutation, getProviderAuthUrlMutation } from '@/api-client/@tanstack/react-query.gen';
import toast from 'react-hot-toast';
import type { TranslatableError } from '@/types/error.types';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useId, useState } from 'react';
import type { CreateProviderResponse, GetProviderAuthUrlResponse } from '@/api-client';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { OAuthForm } from '../oauth-form/oauth-form';

export const AddOAuthProviderDialog = () => {
  const { t } = useTranslation();
  const [isCreated, setIsCreated] = useState(false);
  const [providerId, setProviderId] = useState<number | undefined>(undefined);

  const createProvider = useMutation({
    ...createProviderMutation(),
    onSuccess: (res: CreateProviderResponse) => {
      toast.success('Provider created successfully');
      if (res.id) {
        setProviderId(res.id);
        setIsCreated(true);
      } else {
        toast.error('Failed to load created provider information');
      }
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

  const addProviderdialogDisclosure = useDisclosure();
  const formId = useId();

  return (
    <>
      <Button onClick={() => addProviderdialogDisclosure.open()}>Create Provider</Button>
      <Dialog open={addProviderdialogDisclosure.isOpen} onOpenChange={addProviderdialogDisclosure.toggle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Provider</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <ScrollArea maxheight={500}>
              {isCreated ? (
                <p className="text-muted">
                  Before using this provider, you need to authenticate at least once. Please click the button below to authenticate to your OAuth
                  provider.
                </p>
              ) : (
                <>
                  <p className="text-muted mb-3">Please fill out the form below to create a new OAuth provider.</p>
                  <OAuthForm onSubmit={(values) => createProvider.mutate({ body: values })} formId={formId} isLoading={createProvider.isPending} />
                </>
              )}
            </ScrollArea>
          </DialogDescription>
          <DialogFooter>
            <Button
              intent="dark"
              variant="outline"
              onClick={() => addProviderdialogDisclosure.close()}
              disabled={createProvider.isPending || getProviderUrl.isPending}
            >
              {isCreated ? 'Close' : 'Cancel'}
            </Button>
            {isCreated ? (
              providerId && (
                <Button intent="primary" onClick={() => getProviderUrl.mutate({ path: { id: providerId } })} disabled={getProviderUrl.isPending}>
                  Authorize
                </Button>
              )
            ) : (
              <Button intent="primary" type="submit" form={formId} disabled={createProvider.isPending}>
                Create
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
