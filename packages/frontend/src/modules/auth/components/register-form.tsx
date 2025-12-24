import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { type } from 'arktype';
import type React from 'react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

interface IProps {
  onSubmit: (values: FormValues) => void;
  loading: boolean;
}

type FormValues = { email: string; password: string; passwordConfirm: string };

export const RegisterForm: React.FC<IProps> = ({ onSubmit, loading }) => {
  const { t } = useTranslation();

  const schema = useMemo(
    () =>
      type({
        email: 'string.email',
        password: type('string')
          .atLeastLength(8)
          .configure({ message: t('AUTH_ERROR_INVALID_PASSWORD_LENGTH') }),
        passwordConfirm: type('string')
          .atLeastLength(8)
          .configure({ message: t('AUTH_ERROR_INVALID_PASSWORD_LENGTH') })
          .narrow((confirm, ctx) => confirm === (ctx.root as { password?: string }).password)
          .configure({ message: t('AUTH_FORM_ERROR_PASSWORD_CONFIRMATION_MATCH') }),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: arktypeResolver(schema),
  });

  return (
    <>
      <h2 className="h2 text-center mb-4">{t('AUTH_REGISTER_TITLE')}</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Input
          {...register('email')}
          label={t('AUTH_FORM_EMAIL')}
          error={errors.email?.message}
          disabled={loading}
          type="email"
          className="mb-3"
          placeholder={t('AUTH_FORM_EMAIL_PLACEHOLDER')}
        />
        <Input
          {...register('password')}
          label={t('AUTH_FORM_PASSWORD')}
          error={errors.password?.message}
          disabled={loading}
          type="password"
          className="mb-3"
          placeholder={t('AUTH_FORM_PASSWORD_PLACEHOLDER')}
        />
        <Input
          {...register('passwordConfirm')}
          label={t('AUTH_FORM_PASSWORD_CONFIRMATION')}
          error={errors.passwordConfirm?.message}
          disabled={loading}
          type="password"
          className="mb-3"
          placeholder={t('AUTH_FORM_PASSWORD_CONFIRMATION_PLACEHOLDER')}
        />
        <div className="form-footer">
          <Button loading={loading} type="submit" intent="primary" className="w-100">
            {t('AUTH_REGISTER_SUBMIT')}
          </Button>
        </div>
      </form>
    </>
  );
};
