import React from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

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
  const t = useTranslations('Auth');
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
      <h2 className="h2 text-center mb-3">{t('login.title')}</h2>
      <Input {...register('email')} name="email" label={t('form.email')} error={errors.email?.message} disabled={loading} type="email" className="mb-3" placeholder={t('form.emailPlaceholder')} />
      <span className="form-label-description">
        <Link href="/reset-password">{t('form.forgot')}</Link>
      </span>
      <Input
        {...register('password')}
        name="password"
        label={t('form.password')}
        error={errors.password?.message}
        disabled={loading}
        type="password"
        className="mb-3"
        placeholder={t('form.passwordPlaceholder')}
      />
      <Button disabled={isDisabled} loading={loading} type="submit" className="btn btn-primary w-100">
        Login
      </Button>
    </form>
  );
};
