import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type React from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';

type FormValues = { email: string; password: string };

const schema = z.object({
  email: z.string().email(),
  password: z.string(),
});

interface IProps {
  onSubmit: (values: FormValues) => void;
  loading: boolean;
}

export const LoginForm: React.FC<IProps> = ({ loading, onSubmit }) => {
  const t = useTranslations();
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const watchEmail = watch('email');
  const watchPassword = watch('password');

  const isDisabled = !watchEmail || !watchPassword;

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
      <h2 className="h2 text-center mb-3">{t('AUTH_LOGIN_TITLE')}</h2>
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
      <Input
        {...register('password')}
        name="password"
        label={t('AUTH_FORM_PASSWORD')}
        error={errors.password?.message}
        disabled={loading}
        type="password"
        className="mb-3"
        placeholder={t('AUTH_FORM_PASSWORD_PLACEHOLDER')}
      />
      <Button disabled={isDisabled} loading={loading} type="submit" intent="primary" className="w-100">
        {t('AUTH_LOGIN_SUBMIT')}
      </Button>
      <div className="form-text text-center">
        <Link href="/reset-password">{t('AUTH_FORM_FORGOT')}</Link>
      </div>
    </form>
  );
};
