import { useTranslation } from 'react-i18next';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getProvidersPrivateOptions } from '@/api-client/@tanstack/react-query.gen';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { AddOAuthProviderDialog } from '../add-oauth-provider-dialog/add-oauth-provider-dialog';
import { DeleteOAuthProviderDialog } from '../delete-oauth-provider-dialog/delete-oauth-provider-dialog';
import { useMutation } from '@tanstack/react-query';
import { getProviderAuthUrlMutation } from '@/api-client/@tanstack/react-query.gen';
import toast from 'react-hot-toast';
import type { TranslatableError } from '@/types/error.types';
import type { GetProviderAuthUrlResponse } from '@/api-client';
import { Button } from '@/components/ui/Button';

export const OAuthActions = () => {
  const { t } = useTranslation();

  const { data: oauthProviders } = useSuspenseQuery({
    ...getProvidersPrivateOptions(),
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

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="mt-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Client ID</TableHead>
            <TableHead>Callback URL</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {oauthProviders.providers.length > 0 ? (
            oauthProviders.providers.map((provider) => {
              if (provider.id) {
                const callbackUrl = `${window.location.origin}/api/oidc/providers/${provider.id}/callback`;
                return (
                  <TableRow key={provider.id}>
                    <TableCell>{provider.name}</TableCell>
                    <TableCell>
                      <code style={{ padding: '0.3rem' }}>{provider.clientId}</code>
                    </TableCell>
                    <TableCell>
                      <code style={{ padding: '0.3rem' }} onClick={() => copyToClipboard(callbackUrl)}>
                        {callbackUrl}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Button
                        intent="dark"
                        variant="outline"
                        size="sm"
                        // We have checked for the id already
                        onClick={() => getProviderUrl.mutate({ path: { id: provider.id! } })}
                        disabled={getProviderUrl.isPending}
                        className="me-2"
                      >
                        Authorize
                      </Button>
                      <DeleteOAuthProviderDialog providerId={provider.id} providerName={provider.name} />
                    </TableCell>
                  </TableRow>
                );
              }
            })
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-3">
                <p className="text-muted mb-0">No providers configured, why don't you add one?</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <AddOAuthProviderDialog />
    </div>
  );
};
