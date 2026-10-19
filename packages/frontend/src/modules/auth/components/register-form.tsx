import { arktypeResolver } from '@hookform/resolvers/arktype';
import { IconArrowRight } from '@tabler/icons-react';
import { type } from 'arktype';
import type React from 'react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AuthField } from './auth-field';

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
        email: type('string.email').configure({ message: t('AUTH_FORM_ERROR_EMAIL_INVALID') }),
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
    <form className="rt-auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <h1 className="rt-auth-title">{t('AUTH_REGISTER_HEADING')}</h1>
        <p className="rt-auth-sub">{t('AUTH_REGISTER_SUBTITLE')}</p>
      </div>
      <AuthField
        {...register('email')}
        label={t('AUTH_FORM_EMAIL')}
        type="email"
        autoComplete="username"
        placeholder={t('AUTH_FORM_EMAIL_PLACEHOLDER')}
        error={errors.email?.message}
        disabled={loading}
      />
      <AuthField
        {...register('password')}
        label={t('AUTH_FORM_PASSWORD')}
        type="password"
        autoComplete="new-password"
        placeholder={t('AUTH_FORM_PASSWORD_PLACEHOLDER')}
        error={errors.password?.message}
        disabled={loading}
      />
      <AuthField
        {...register('passwordConfirm')}
        label={t('AUTH_FORM_PASSWORD_CONFIRMATION')}
        type="password"
        autoComplete="new-password"
        placeholder={t('AUTH_FORM_PASSWORD_CONFIRMATION_PLACEHOLDER')}
        error={errors.passwordConfirm?.message}
        disabled={loading}
      />
      <button type="submit" className="rt-auth-submit" disabled={loading}>
        {t('AUTH_REGISTER_SUBMIT')}
        <IconArrowRight size={16} stroke={2.2} />
      </button>
    </form>
  );
};
