import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { createProviderMutation } from '@/api-client/@tanstack/react-query.gen';
import toast from 'react-hot-toast';
import type { TranslatableError } from '@/types/error.types';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useId, useState } from 'react';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { OAuthForm } from '../oauth-form/oauth-form';
import { useEffect } from 'react';

export const AddOAuthProviderDialog = () => {
  const { t } = useTranslation();
  const [isCreated, setIsCreated] = useState(false);

  const createProvider = useMutation({
    ...createProviderMutation(),
    onSuccess: () => {
      toast.success(t('SETTINGS_SECURITY_OAUTH_CREATE_SUCCESS'));
      setIsCreated(true);
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const addProviderdialogDisclosure = useDisclosure();
  const formId = useId();

  useEffect(() => {
    if (!addProviderdialogDisclosure.isOpen) {
      setIsCreated(false);
    }
  }, [addProviderdialogDisclosure.isOpen]);

  return (
    <>
      <Button onClick={() => addProviderdialogDisclosure.open()}>{t('SETTINGS_SECURITY_OAUTH_ADD_PROVIDER')}</Button>
      <Dialog open={addProviderdialogDisclosure.isOpen} onOpenChange={addProviderdialogDisclosure.toggle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_SECURITY_OAUTH_ADD_PROVIDER')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <ScrollArea maxheight={500}>
              {isCreated ? (
                <p className="text-muted">{t('SETTINGS_SECURITY_OAUTH_ADD_PROVIDER_AUTHORIZE')}</p>
              ) : (
                <>
                  <p className="text-muted mb-3">{t('SETTINGS_SECURITY_OAUTH_ADD_PROVIDER_DESCRIPTION')}</p>
                  <OAuthForm onSubmit={(values) => createProvider.mutate({ body: values })} formId={formId} isLoading={createProvider.isPending} />
                </>
              )}
            </ScrollArea>
          </DialogDescription>
          <DialogFooter>
            <Button intent="dark" variant="outline" onClick={() => addProviderdialogDisclosure.close()} disabled={createProvider.isPending}>
              {isCreated ? t('CLOSE') : t('ACTIONS_CANCEL')}
            </Button>
            {!isCreated && (
              <Button intent="primary" type="submit" form={formId} disabled={createProvider.isPending}>
                {t('CREATE')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
