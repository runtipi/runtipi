import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { type } from 'arktype';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import './login-form.css';
import { IconBrandOauth } from '@tabler/icons-react';

type FormValues = { email: string; password: string };

const schema = type({
  email: 'string.email',
  password: 'string',
});

interface IProps {
  onSubmit: (values: FormValues) => void;
  loading: boolean;
  loginType: string;
  oauthProviders: { id: number; name: string }[];
  onOAuthClick: (provider: { id: number }) => void;
}

export const LoginForm: React.FC<IProps> = ({ loading, onSubmit, loginType, oauthProviders, onOAuthClick }) => {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    resolver: arktypeResolver(schema),
  });

  const watchEmail = watch('email');
  const watchPassword = watch('password');

  const isDisabled = !watchEmail || !watchPassword;

  return (
    <>
      <h2 className="h2 text-center mb-4">{t('AUTH_LOGIN_TITLE', { type: loginType })}</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Input
          {...register('email')}
          name="email"
          label={t('AUTH_FORM_EMAIL')}
          error={errors.email?.message}
          disabled={loading}
          type="email"
          className="mb-3"
          placeholder={t('AUTH_FORM_EMAIL_PLACEHOLDER')}
        />
        <div>
          <Input
            {...register('password')}
            name="password"
            label={t('AUTH_FORM_PASSWORD')}
            error={errors.password?.message}
            disabled={loading}
            type="password"
            placeholder={t('AUTH_FORM_PASSWORD_PLACEHOLDER')}
          />
          <div className="form-text forgot-password-link">
            <Link to="/reset-password">{t('AUTH_FORM_FORGOT')}</Link>
          </div>
        </div>
        <div className="form-footer">
          <Button disabled={isDisabled} loading={loading} type="submit" intent="primary" className="w-100">
            {t('AUTH_LOGIN_SUBMIT')}
          </Button>
        </div>
      </form>
      {oauthProviders.length > 0 && (
        <div className="mt-3">
          <div className="hr-text">Or login with</div>
          <div className="d-flex gap-3 flex-column">
            {oauthProviders.map((provider) => (
              <Button key={provider.id} onClick={() => onOAuthClick(provider)} intent="dark" variant="outline" className="w-100">
                <IconBrandOauth size={16} className="me-2" />
                <span>{provider.name}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
