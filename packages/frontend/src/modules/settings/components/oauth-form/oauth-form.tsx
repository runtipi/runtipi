import { useTranslation } from 'react-i18next';
import { type } from 'arktype';
import { useForm } from 'react-hook-form';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { Input } from '@/components/ui/Input';
import type { GetOidcProviderDto } from '@/api-client';

const schema = type({
  slug: 'string >= 1',
  displayName: 'string >= 1',
  clientId: 'string >=1',
  clientSecret: 'string',
  issuer: 'string.url',
  discovery: 'string.url',
});

export type FormValues = typeof schema.infer;

interface OAuthFormProps {
  onSubmit: (values: FormValues) => void;
  initialValues?: GetOidcProviderDto;
  formId?: string;
  isLoading?: boolean;
}

export const OAuthForm = ({ onSubmit, formId, isLoading, initialValues }: OAuthFormProps) => {
  const { t } = useTranslation();

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: arktypeResolver(initialValues ? schema : schema.and({ clientSecret: 'string >= 1' })),
    defaultValues: { ...initialValues, clientSecret: '' },
  });

  return (
    <form id={formId} onSubmit={handleSubmit((values) => onSubmit(values))}>
      <Input
        error={formState.errors.slug?.message}
        disabled={isLoading}
        readOnly={Boolean(initialValues)}
        type="text"
        label={t('SETTINGS_SECURITY_OAUTH_FORM_SLUG')}
        placeholder="my-provider"
        className="mb-3"
        required
        {...register('slug')}
      />
      <Input
        error={formState.errors.displayName?.message}
        disabled={isLoading}
        type="text"
        label={t('SETTINGS_SECURITY_OAUTH_FORM_NAME')}
        placeholder="My Provider"
        className="mb-3"
        required
        {...register('displayName')}
      />
      <Input
        error={formState.errors.clientId?.message}
        disabled={isLoading}
        type="text"
        label={t('SETTINGS_SECURITY_OAUTH_FORM_CLIENT_ID')}
        placeholder="client-id"
        className="mb-3"
        required
        {...register('clientId')}
      />
      <Input
        error={formState.errors.clientSecret?.message}
        disabled={isLoading}
        type="password"
        label={t('SETTINGS_SECURITY_OAUTH_FORM_CLIENT_SECRET')}
        autoComplete="new-password"
        placeholder={initialValues ? t('SETTINGS_SECURITY_OAUTH_SECRET_UNCHANGED') : 'client-secret'}
        className="mb-3"
        required={!initialValues}
        {...register('clientSecret')}
      />
      <Input
        error={formState.errors.issuer?.message}
        disabled={isLoading}
        type="text"
        label={t('SETTINGS_SECURITY_OAUTH_FORM_ISSUER')}
        placeholder="https://idp.example.com"
        className="mb-3"
        required
        {...register('issuer')}
      />
      <Input
        error={formState.errors.discovery?.message}
        disabled={isLoading}
        type="text"
        label={t('SETTINGS_SECURITY_OAUTH_FORM_DISCOVERY')}
        placeholder="https://idp.example.com/.well-known/openid-configuration"
        className="mb-3"
        required
        {...register('discovery')}
      />
    </form>
  );
};
