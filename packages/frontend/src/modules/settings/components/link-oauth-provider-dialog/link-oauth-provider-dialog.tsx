import { linkProviderMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Input } from '@/components/ui/Input';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import { useId, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const LinkOAuthProviderDialog = ({ provider }: { provider: { slug: string; displayName: string } }) => {
  const { t } = useTranslation();
  const disclosure = useDisclosure();
  const formId = useId();
  const [password, setPassword] = useState('');

  const link = useMutation({
    ...linkProviderMutation(),
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error: TranslatableError) => toast.error(t(error.message, error.intlParams)),
  });

  const changeOpen = (open: boolean) => {
    setPassword('');
    disclosure.toggle(open);
  };

  return (
    <>
      <DropdownMenuItem onClick={() => changeOpen(true)} onSelect={(event) => event.preventDefault()}>
        {t('SETTINGS_SECURITY_OAUTH_AUTHORIZE')}
      </DropdownMenuItem>
      <Dialog open={disclosure.isOpen} onOpenChange={changeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_SECURITY_OAUTH_LINK_TITLE', { provider: provider.displayName })}</DialogTitle>
          </DialogHeader>
          <DialogDescription>{t('SETTINGS_SECURITY_OAUTH_LINK_DESCRIPTION')}</DialogDescription>
          <form
            id={formId}
            onSubmit={(event) => {
              event.preventDefault();
              link.mutate({ path: { slug: provider.slug }, body: { password } });
            }}
          >
            <Input
              name="link-password"
              label={t('AUTH_FORM_PASSWORD')}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={link.isPending}
            />
          </form>
          <DialogFooter>
            <Button intent="dark" variant="outline" onClick={() => changeOpen(false)} disabled={link.isPending}>
              {t('ACTIONS_CANCEL')}
            </Button>
            <Button type="submit" form={formId} loading={link.isPending} disabled={!password}>
              {t('SETTINGS_SECURITY_OAUTH_AUTHORIZE')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
