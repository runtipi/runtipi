import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface IProps {
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
  loading: boolean;
}

type FormValues = { password: string; passwordConfirm: string };

export const ResetPasswordForm: React.FC<IProps> = ({ onSubmit, loading, onCancel }) => {
  const t = useTranslations('auth');
  const schema = z
    .object({
      password: z.string().min(8, t('form.errors.password.minlength')),
      passwordConfirm: z.string().min(8, t('form.errors.password.minlength')),
    })
    .superRefine((data, ctx) => {
      if (data.password !== data.passwordConfirm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('form.errors.password-confirmation.match'),
          path: ['passwordConfirm'],
        });
      }
    });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
      <h2 className="h2 text-center mb-3">{t('reset-password.title')}</h2>
      <Input
        {...register('password')}
        label={t('form.password')}
        error={errors.password?.message}
        disabled={loading}
        type="password"
        className="mb-3"
        placeholder={t('form.new-password-placeholder')}
      />
      <Input
        {...register('passwordConfirm')}
        label={t('form.password-confirmation')}
        error={errors.passwordConfirm?.message}
        disabled={loading}
        type="password"
        className="mb-3"
        placeholder={t('form.new-password-confirmation-placeholder')}
      />
      <Button loading={loading} type="submit" className="btn btn-primary w-100">
        {t('reset-password.submit')}
      </Button>
      <Button onClick={onCancel} type="button" className="btn btn-secondary w-100 mt-3">
        {t('reset-password.cancel')}
      </Button>
    </form>
  );
};
