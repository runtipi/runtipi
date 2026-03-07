import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSuspenseQuery, useMutation } from '@tanstack/react-query';
import {
  deleteTrustedSubMutation,
  getProvidersPrivateOptions,
  getTrustedSubsOptions,
  getProviderAuthUrlMutation,
} from '@/api-client/@tanstack/react-query.gen';
import { DeleteOAuthProviderDialog } from '../delete-oauth-provider-dialog/delete-oauth-provider-dialog';
import { EditOAuthProviderDialog } from '../edit-oauth-provider-dialog/edit-oauth-provider-dialog';
import toast from 'react-hot-toast';
import type { TranslatableError } from '@/types/error.types';
import type { GetProviderAuthUrlResponse } from '@/api-client';
import { Button } from '@/components/ui/Button';
import { DateFormat } from '@/components/date-format/date-format';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { IconDots } from '@tabler/icons-react';
import { DropdownMenuSeparator } from '@/components/ui/DropdownMenu/DropdownMenu';
import './oauth-actions.css';
import clsx from 'clsx';

export const OAuthActions = () => {
  const { t } = useTranslation();
  const [expandedProvider, setExpandedProvider] = useState<number | null>(null);

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
    onSuccess: () => toast.success('Sub deleted!'),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Copied to clipboard');
  };

  if (oauthProviders.providers.length === 0) {
    return (
      <div className="mt-2 card">
        <div className="card-body">
          <p className="text-muted fst-italic mt-1">No providers configured yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 card">
      <div className="card-body">
        {oauthProviders.providers.map((provider, index) => {
          if (!provider.id) return null;

          const callbackUrl = `${window.location.origin}/api/oidc/providers/${provider.id}/callback`;
          const isExpanded = expandedProvider === provider.id;
          const providerSubs = trustedSubs.subs.filter((s) => s.providerId === provider.id);
          const isLast = index === oauthProviders.providers.length - 1;

          return (
            <div key={provider.id} className={clsx(!isLast && 'mb-3')}>
              <div className={clsx('d-flex justify-content-between align-items-center', !isLast && 'border-bottom pb-3')}>
                <div className="d-flex align-items-center gap-2">
                  <span className="avatar rounded" aria-hidden="true">
                    {provider.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p style={{ marginBottom: '0.2rem' }}>
                      <strong>{provider.name}</strong>
                    </p>
                    <div className="text-muted">
                      {providerSubs.length} trusted user{providerSubs.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-md-row flex-column gap-2">
                  <Button variant="outline" intent="dark" onClick={() => setExpandedProvider(isExpanded ? null : provider.id!)}>
                    {isExpanded ? 'Hide Details' : 'Details'}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" intent="dark">
                        <IconDots size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => getProviderUrl.mutate({ path: { id: provider.id! } })}>Authorize</DropdownMenuItem>
                        <EditOAuthProviderDialog provider={provider} />
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DeleteOAuthProviderDialog providerId={provider.id} providerName={provider.name} />
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {isExpanded && (
                <div key={provider.id} className={clsx('mt-3', isLast && 'border-top pt-3')}>
                  <dl className="row mb-3 small">
                    <dt className="col-sm-2 mb-2 mb-md-0 fw-normal">Client ID</dt>
                    <dd className="col-sm-10 mb-3 mb-md-1">
                      <code>{provider.clientId}</code>
                    </dd>
                    <dt className="col-sm-2 mb-2 mb-md-0 fw-normal">Callback URL</dt>
                    <dd className="col-sm-10 mb-0">
                      <code
                        title="Click to copy"
                        aria-label="Copy callback URL to clipboard"
                        onClick={() => copyToClipboard(callbackUrl)}
                        onKeyDown={(e) => e.key === 'Enter' && copyToClipboard(callbackUrl)}
                        style={{ cursor: 'pointer' }}
                      >
                        {callbackUrl}
                      </code>
                    </dd>
                  </dl>

                  {providerSubs.length === 0 ? (
                    <p className="small fst-italic">No trusted users yet.</p>
                  ) : (
                    <>
                      <p className="small mb-2">The accounts below (identified by their subject IDs) are allowed to sign in via {provider.name}.</p>
                      {providerSubs.map((sub) => (
                        <div key={sub.sub} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                          <div className="small">
                            <code>{sub.sub}</code>
                            <span className="ms-1 text-muted">
                              added <DateFormat date={new Date(sub.createdAt * 1000)} />
                            </span>
                          </div>
                          <Button
                            intent="danger"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSub.mutate({ path: { id: sub.id } })}
                            disabled={deleteSub.isPending}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
