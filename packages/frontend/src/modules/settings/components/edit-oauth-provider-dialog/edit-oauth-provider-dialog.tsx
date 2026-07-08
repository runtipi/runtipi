import type { GetProviderAuthUrlResponse } from '@/api-client';
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
import { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { useEffect } from 'react';

export interface EditOAuthProviderDialogProps {
  provider: {
    clientId: string;
    clientSecret: string;
    displayName: string;
    slug: string;
    discovery: string;
    issuer: string;
  };
}

export const EditOAuthProviderDialog = ({ provider }: EditOAuthProviderDialogProps) => {
  const { t } = useTranslation();
  const [edited, setEdited] = useState(false);

  const editProvider = useMutation({
    ...editProviderMutation(),
    onSuccess: () => {
      toast.success(t('SETTINGS_SECURITY_OAUTH_PROVIDER_EDIT_SUCCESS'));
      setEdited(true);
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const getProviderUrl = useMutation({
    ...getProviderAuthUrlMutation(),
    onSuccess: (res: GetProviderAuthUrlResponse) => {
      toast.success(t('SETTINGS_SECURITY_OAUTH_AUTHORIZE_REDIRECT'));
      setTimeout(() => {
        window.location.href = res.url;
      }, 500);
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const formId = useId();
  const editProviderDialogDisclosure = useDisclosure();

  useEffect(() => {
    if (!editProviderDialogDisclosure.isOpen) {
      setEdited(false);
    }
  }, [editProviderDialogDisclosure.isOpen]);

  return (
    <>
      <DropdownMenuItem onClick={() => editProviderDialogDisclosure.open()} onSelect={(e) => e.preventDefault()}>
        {t('EDIT')}
      </DropdownMenuItem>
      <Dialog open={editProviderDialogDisclosure.isOpen} onOpenChange={editProviderDialogDisclosure.toggle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_SECURITY_OAUTH_EDIT_MODAL_TITLE', { provider: provider.displayName })}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <ScrollArea maxheight={500}>
              {edited ? (
                <p className="text-muted">{t('SETTINGS_SECURITY_OAUTH_EDIT_AUTHORIZE_SUBTITLE')}</p>
              ) : (
                <>
                  <p className="text-muted mb-3">{t('SETTINGS_SECURITY_OAUTH_EDIT_SUBTITLE')}</p>
                  <OAuthForm
                    onSubmit={(values) => editProvider.mutate({ path: { slug: provider.slug }, body: values })}
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
              {edited ? t('CLOSE') : t('ACTIONS_CANCEL')}
            </Button>
            {edited ? (
              <Button intent="primary" onClick={() => getProviderUrl.mutate({ path: { slug: provider.slug } })} disabled={getProviderUrl.isPending}>
                {t('SETTINGS_SECURITY_OAUTH_AUTHORIZE')}
              </Button>
            ) : (
              <Button intent="primary" type="submit" form={formId} disabled={editProvider.isPending}>
                {t('UPDATE')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
