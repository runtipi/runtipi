import { type } from 'arktype';
import { useForm } from 'react-hook-form';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { Input } from '@/components/ui/Input';
import { useMutation } from '@tanstack/react-query';
import { createProviderMutation, getProviderAuthUrlMutation } from '@/api-client/@tanstack/react-query.gen';
import toast from 'react-hot-toast';
import type { TranslatableError } from '@/types/error.types';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import type { GetProviderAuthUrlResponse } from '@/api-client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getProvidersPublicOptions } from '@/api-client/@tanstack/react-query.gen';

export const OAuthForm = () => {
  const { t } = useTranslation();

  const schema = type({
    name: 'string',
    clientId: 'string',
    clientSecret: 'string',
    authorizeUri: 'string',
    tokenUri: 'string',
    userInfoUri: 'string',
  });

  type FormValues = typeof schema.infer;

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: arktypeResolver(schema),
  });

  const { data: oauthProviders } = useSuspenseQuery({
    ...getProvidersPublicOptions(),
  });

  const createProvider = useMutation({
    ...createProviderMutation(),
    onSuccess: () => {
      toast.success('Provider created successfully');
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const getOAuthUrl = useMutation({
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

  const onSubmit = (body: FormValues) => {
    createProvider.mutate({ body });
  };

  return (
    <div className="mt-2">
      {oauthProviders.providers.length === 0 ? (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            error={formState.errors.name?.message}
            disabled={createProvider.isPending}
            type="text"
            label="Name"
            placeholder="My Provider"
            className="mb-3"
            {...register('name')}
          />
          <Input
            error={formState.errors.clientId?.message}
            disabled={createProvider.isPending}
            type="text"
            label="Client ID"
            placeholder="client-id"
            className="mb-3"
            {...register('clientId')}
          />
          <Input
            error={formState.errors.clientSecret?.message}
            disabled={createProvider.isPending}
            type="text"
            label="Client Secret"
            placeholder="client-secret"
            className="mb-3"
            {...register('clientSecret')}
          />
          <Input
            error={formState.errors.authorizeUri?.message}
            disabled={createProvider.isPending}
            type="text"
            label="Authorize URI"
            placeholder="https://example.com/authorize"
            className="mb-3"
            {...register('authorizeUri')}
          />
          <Input
            error={formState.errors.tokenUri?.message}
            disabled={createProvider.isPending}
            type="text"
            label="Token URI"
            placeholder="https://example.com/token"
            className="mb-3"
            {...register('tokenUri')}
          />
          <Input
            error={formState.errors.userInfoUri?.message}
            disabled={createProvider.isPending}
            type="text"
            label="User Info URI"
            placeholder="https://example.com/userinfo"
            className="mb-3"
            {...register('userInfoUri')}
          />
          <Button type="submit">Submit</Button>
        </form>
      ) : (
        <>
          <p className="text-muted mb-3">Your provider is configured, click the button below to store or update the trusted sub list.</p>
          <div className="d-flex gap-3">
            {oauthProviders.providers.map((provider) => (
              <Button key={provider.id} onClick={() => getOAuthUrl.mutate({ path: { id: provider.id } })} intent="primary">
                {provider.name}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
