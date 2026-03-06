import { useTranslation } from 'react-i18next';
import { useSuspenseQuery } from '@tanstack/react-query';
import { deleteTrustedSubMutation, getProvidersPrivateOptions, getTrustedSubsOptions } from '@/api-client/@tanstack/react-query.gen';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { DeleteOAuthProviderDialog } from '../delete-oauth-provider-dialog/delete-oauth-provider-dialog';
import { useMutation } from '@tanstack/react-query';
import { getProviderAuthUrlMutation } from '@/api-client/@tanstack/react-query.gen';
import toast from 'react-hot-toast';
import type { TranslatableError } from '@/types/error.types';
import type { GetProviderAuthUrlResponse } from '@/api-client';
import { Button } from '@/components/ui/Button';
import { DateFormat } from '@/components/date-format/date-format';

export const OAuthActions = () => {
  const { t } = useTranslation();

  const { data: oauthProviders } = useSuspenseQuery({
    ...getProvidersPrivateOptions(),
  });

  const { data: trustedSubs } = useSuspenseQuery({
    ...getTrustedSubsOptions(),
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

  const deleteSub = useMutation({
    ...deleteTrustedSubMutation(),
    onSuccess: () => {
      toast.success('Sub deleted!');
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
      <p className="text-muted mt-3">
        Below you can manage your trusted <code style={{ padding: '0.3rem' }}>sub</code> claims from your OAuth providers.
      </p>
      <Table className="mt-2">
        <TableHeader>
          <TableRow>
            <TableCell>Sub</TableCell>
            <TableCell>Provider</TableCell>
            <TableCell>Created At</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trustedSubs.subs.length > 0 ? (
            trustedSubs.subs.map((sub) => (
              <TableRow key={sub.sub}>
                <TableCell>
                  <code style={{ padding: '0.3rem' }}>{sub.sub}</code>
                </TableCell>
                <TableCell>{oauthProviders.providers.find((p) => p.id === sub.providerId)?.name ?? 'Unkown'}</TableCell>
                <TableCell>
                  <DateFormat date={new Date(sub.createdAt * 1000)} />
                </TableCell>
                <TableCell>
                  <Button
                    intent="danger"
                    variant="outline"
                    size="sm"
                    onClick={() => deleteSub.mutate({ path: { id: sub.id } })}
                    disabled={deleteSub.isPending}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-3">
                <p className="text-muted mb-0">No trusted subs configured.</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
