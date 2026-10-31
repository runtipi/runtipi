import { createProviderMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import { useId } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { OAuthForm } from '../oauth-form/oauth-form';

export const AddOAuthProviderDialog = () => {
  const { t } = useTranslation();
  const disclosure = useDisclosure();
  const formId = useId();

  const createProvider = useMutation({
    ...createProviderMutation(),
    onSuccess: () => {
      toast.success(t('SETTINGS_SECURITY_OAUTH_CREATE_SUCCESS'));
      disclosure.close();
    },
    onError: (error: TranslatableError) => toast.error(t(error.message, error.intlParams)),
  });

  return (
    <>
      <Button onClick={disclosure.open}>{t('SETTINGS_SECURITY_OAUTH_ADD_PROVIDER')}</Button>
      <Dialog open={disclosure.isOpen} onOpenChange={disclosure.toggle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_SECURITY_OAUTH_ADD_PROVIDER')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>{t('SETTINGS_SECURITY_OAUTH_ADD_PROVIDER_DESCRIPTION')}</DialogDescription>
          <ScrollArea maxheight={500}>
            <OAuthForm onSubmit={(values) => createProvider.mutate({ body: values })} formId={formId} isLoading={createProvider.isPending} />
          </ScrollArea>
          <DialogFooter>
            <Button intent="dark" variant="outline" onClick={disclosure.close} disabled={createProvider.isPending}>
              {t('ACTIONS_CANCEL')}
            </Button>
            <Button intent="primary" type="submit" form={formId} loading={createProvider.isPending}>
              {t('CREATE')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
