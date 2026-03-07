import { useTranslation } from 'react-i18next';
import { type } from 'arktype';
import { useForm } from 'react-hook-form';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { Input } from '@/components/ui/Input';

const schema = type({
  name: 'string',
  clientId: 'string',
  clientSecret: 'string',
  authorizeUri: 'string',
  tokenUri: 'string',
  userinfoUri: 'string',
});

export type FormValues = typeof schema.infer;

interface OAuthFormProps {
  onSubmit: (values: FormValues) => void;
  initialValues?: FormValues;
  formId?: string;
  isLoading?: boolean;
}

export const OAuthForm = ({ onSubmit, formId, isLoading, initialValues }: OAuthFormProps) => {
  const { t } = useTranslation();

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: arktypeResolver(schema),
    defaultValues: initialValues,
  });

  return (
    <form id={formId} onSubmit={handleSubmit((values) => onSubmit(values))}>
      <Input
        error={formState.errors.name?.message}
        disabled={isLoading}
        type="text"
        label="Name"
        placeholder="My Provider"
        className="mb-3"
        {...register('name')}
      />
      <Input
        error={formState.errors.clientId?.message}
        disabled={isLoading}
        type="text"
        label="Client ID"
        placeholder="client-id"
        className="mb-3"
        {...register('clientId')}
      />
      <Input
        error={formState.errors.clientSecret?.message}
        disabled={isLoading}
        type="password"
        label="Client Secret"
        placeholder="client-secret"
        className="mb-3"
        {...register('clientSecret')}
      />
      <Input
        error={formState.errors.authorizeUri?.message}
        disabled={isLoading}
        type="text"
        label="Authorize URI"
        placeholder="https://example.com/authorize"
        className="mb-3"
        {...register('authorizeUri')}
      />
      <Input
        error={formState.errors.tokenUri?.message}
        disabled={isLoading}
        type="text"
        label="Token URL"
        placeholder="https://example.com/token"
        className="mb-3"
        {...register('tokenUri')}
      />
      <Input
        error={formState.errors.userinfoUri?.message}
        disabled={isLoading}
        type="text"
        label="User Info URL"
        placeholder="https://example.com/userinfo"
        className="mb-3"
        {...register('userinfoUri')}
      />
    </form>
  );
};
