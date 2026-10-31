import type { GetOidcProviderDto } from '@/api-client';
import { editProviderMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import { useId } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { OAuthForm } from '../oauth-form/oauth-form';

export const EditOAuthProviderDialog = ({ provider }: { provider: GetOidcProviderDto }) => {
  const { t } = useTranslation();
  const disclosure = useDisclosure();
  const formId = useId();

  const editProvider = useMutation({
    ...editProviderMutation(),
    onSuccess: () => {
      toast.success(t('SETTINGS_SECURITY_OAUTH_PROVIDER_EDIT_SUCCESS'));
      disclosure.close();
    },
    onError: (error: TranslatableError) => toast.error(t(error.message, error.intlParams)),
  });

  return (
    <>
      <DropdownMenuItem onClick={disclosure.open} onSelect={(event) => event.preventDefault()}>
        {t('EDIT')}
      </DropdownMenuItem>
      <Dialog open={disclosure.isOpen} onOpenChange={disclosure.toggle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_SECURITY_OAUTH_EDIT_MODAL_TITLE', { provider: provider.displayName })}</DialogTitle>
          </DialogHeader>
          <DialogDescription>{t('SETTINGS_SECURITY_OAUTH_EDIT_SUBTITLE')}</DialogDescription>
          <ScrollArea maxheight={500}>
            <OAuthForm
              onSubmit={({ slug, clientSecret, ...settings }) => {
                const body = { ...settings, clientSecret: clientSecret || undefined };
                editProvider.mutate({ path: { slug }, body });
              }}
              formId={formId}
              isLoading={editProvider.isPending}
              initialValues={provider}
            />
          </ScrollArea>
          <DialogFooter>
            <Button intent="dark" variant="outline" onClick={disclosure.close} disabled={editProvider.isPending}>
              {t('ACTIONS_CANCEL')}
            </Button>
            <Button intent="primary" type="submit" form={formId} loading={editProvider.isPending}>
              {t('UPDATE')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
