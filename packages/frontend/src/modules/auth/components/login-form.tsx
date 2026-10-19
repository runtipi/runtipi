import { useUserContext } from '@/context/user-context';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { IconArrowRight } from '@tabler/icons-react';
import { type } from 'arktype';
import type React from 'react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AuthField } from './auth-field';

type FormValues = { email: string; password: string };

interface IProps {
  onSubmit: (values: FormValues) => void;
  loading: boolean;
  /** Name of the app the user signs in to, when coming from forward auth */
  appName?: string;
}

export const LoginForm: React.FC<IProps> = ({ loading, onSubmit, appName }) => {
  const { t } = useTranslation();
  const { isGuestDashboardEnabled } = useUserContext();
  const schema = useMemo(
    () =>
      type({
        email: type('string.email').configure({ message: t('AUTH_FORM_ERROR_EMAIL_INVALID') }),
        password: 'string',
      }),
    [t],
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    resolver: arktypeResolver(schema),
  });

  const isDisabled = !watch('email') || !watch('password') || loading;

  return (
    <form className="rt-auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <h1 className="rt-auth-title">{t('AUTH_LOGIN_HEADING')}</h1>
        <p className="rt-auth-sub">{appName ? t('AUTH_LOGIN_SUBTITLE_APP', { app: appName }) : t('AUTH_LOGIN_SUBTITLE')}</p>
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
        autoComplete="current-password"
        placeholder={t('AUTH_FORM_YOUR_PASSWORD')}
        error={errors.password?.message}
        disabled={loading}
        aside={
          <Link to="/reset-password" className="rt-auth-link">
            {t('AUTH_FORM_FORGOT')}
          </Link>
        }
      />

      <button type="submit" className="rt-auth-submit" disabled={isDisabled}>
        {t('AUTH_LOGIN_SUBMIT')}
        <IconArrowRight size={16} stroke={2.2} />
      </button>

      {isGuestDashboardEnabled && (
        <Link to="/dashboard" className="rt-auth-back rt-auth-back--center">
          ← {t('AUTH_BACK_TO_APPS')}
        </Link>
      )}
    </form>
  );
};
