import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSuspenseQuery, useMutation } from '@tanstack/react-query';
import {
  deleteTrustedSubMutation,
  getTrustedSubsOptions,
  getProviderAuthUrlMutation,
  getUserProvidersOptions,
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
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const { data: oauthProviders } = useSuspenseQuery({
    ...getUserProvidersOptions(),
  });

  const { data: trustedSubs } = useSuspenseQuery({
    ...getTrustedSubsOptions(),
  });

  const getProviderURL = useMutation({
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

  const deleteSub = useMutation({
    ...deleteTrustedSubMutation(),
    onSuccess: () => toast.success(t('SETTINGS_SECURITY_OAUTH_SUB_DELETE_SUCCESS')),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success(t('SETTINGS_SECURITY_OAUTH_SUB_COPIED_CLIPBOARD'));
  };

  if (oauthProviders.providers.length === 0) {
    return (
      <div className="mt-2 card">
        <div className="card-body">
          <p className="text-muted fst-italic mt-1">{t('SETTINGS_SECURITY_OAUTH_NO_PROVIDERS')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 card">
      <div className="card-body">
        {oauthProviders.providers.map((provider, index) => {
          if (!provider.slug) return null;

          const callbackUrl = `${window.location.origin}/api/oidc/providers/${provider.slug}/callback`;
          const isExpanded = expandedProvider === provider.slug;
          const providerSubs = trustedSubs.subs.filter((s) => s.slug.startsWith(provider.slug));
          const isLast = index === oauthProviders.providers.length - 1;

          return (
            <div key={provider.slug} className={clsx(!isLast && 'mb-3')}>
              <div className={clsx('d-flex justify-content-between align-items-center', !isLast && 'border-bottom pb-3')}>
                <div className="d-flex align-items-center gap-2">
                  <span className="avatar rounded" aria-hidden="true">
                    {provider.displayName.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p style={{ marginBottom: '0.2rem' }}>
                      <strong>{provider.displayName}</strong>
                    </p>
                    <div className="text-muted">
                      {providerSubs.length === 0
                        ? t('SETTINGS_SECURITY_OAUTH_NO_TRUSTED_USERS')
                        : providerSubs.length === 1
                          ? t('SETTINGS_SECURITY_OAUTH_TRUSTED_USER_ONE')
                          : t('SETTINGS_SECURITY_OAUTH_TRUSTED_USER_MANY', { count: providerSubs.length })}
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-md-row flex-column gap-2">
                  <Button variant="outline" intent="dark" onClick={() => setExpandedProvider(isExpanded ? null : provider.slug)}>
                    {isExpanded ? t('SETTINGS_SECURITY_OAUTH_DETAILS_HIDE') : t('SETTINGS_SECURITY_OAUTH_DETAILS_SHOW')}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" intent="dark">
                        <IconDots size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => getProviderURL.mutate({ path: { slug: provider.slug } })}>
                          {t('SETTINGS_SECURITY_OAUTH_AUTHORIZE')}
                        </DropdownMenuItem>
                        <EditOAuthProviderDialog provider={provider} />
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DeleteOAuthProviderDialog providerSlug={provider.slug} providerDisplayName={provider.displayName} />
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {isExpanded && (
                <div key={provider.slug} className={clsx('mt-3', isLast && 'border-top pt-3')}>
                  <dl className="row mb-3 small">
                    <dt className="col-sm-2 mb-2 mb-md-0 fw-normal">{t('SETTINGS_SECURITY_OAUTH_FORM_CLIENT_ID')}</dt>
                    <dd className="col-sm-10 mb-3 mb-md-1">
                      <code className="oauth-actions-code">{provider.clientId}</code>
                    </dd>
                    <dt className="col-sm-2 mb-2 mb-md-0 fw-normal">{t('SETTINGS_SECURITY_OAUTH_CALLBACK_URL')}</dt>
                    <dd className="col-sm-10 mb-0">
                      <code
                        title="Click to copy"
                        onClick={() => copyToClipboard(callbackUrl)}
                        onKeyDown={(e) => e.key === 'Enter' && copyToClipboard(callbackUrl)}
                        style={{ cursor: 'pointer' }}
                        className="oauth-actions-code"
                      >
                        {callbackUrl}
                      </code>
                    </dd>
                  </dl>

                  {providerSubs.length === 0 ? (
                    <p className="small fst-italic">{t('SETTINGS_SECURITY_OAUTH_NO_TRUSTED_USERS')}</p>
                  ) : (
                    <>
                      <p className="small mb-2">{t('SETTINGS_SECURITY_OAUTH_TRUSTED_USERS_DESCRIPTION', { provider: provider.displayName })}</p>
                      {providerSubs.map((sub) => (
                        <div key={sub.sub} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                          <div className="small">
                            <code className="oauth-actions-code">{sub.sub}</code>
                            <span className="ms-1 text-muted">
                              - {t('SETTINGS_SECURITY_OAUTH_SUB_ENTRY_ADDED')}&nbsp;
                              <DateFormat date={new Date(sub.createdAt * 1000)} />
                            </span>
                          </div>
                          <Button
                            intent="danger"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSub.mutate({ path: { slug: sub.slug } })}
                            disabled={deleteSub.isPending}
                          >
                            {t('REMOVE')}
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
