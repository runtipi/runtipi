import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface IProps {
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
  loading: boolean;
}

type FormValues = { password: string; passwordConfirm: string };

export const ResetPasswordForm: React.FC<IProps> = ({ onSubmit, loading, onCancel }) => {
  const t = useTranslations();
  const schema = z
    .object({
      password: z.string().min(8, t('AUTH_FORM_ERROR_PASSWORD_LENGTH')),
      passwordConfirm: z.string().min(8, t('AUTH_FORM_ERROR_PASSWORD_CONFIRMATION_LENGTH')),
    })
    .superRefine((data, ctx) => {
      if (data.password !== data.passwordConfirm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('AUTH_FORM_ERROR_PASSWORD_CONFIRMATION_MATCH'),
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
      <h2 className="h2 text-center mb-3">{t('AUTH_RESET_PASSWORD_TITLE')}</h2>
      <Input
        {...register('password')}
        label={t('AUTH_FORM_PASSWORD')}
        error={errors.password?.message}
        disabled={loading}
        type="password"
        className="mb-3"
        placeholder={t('AUTH_FORM_NEW_PASSWORD_PLACEHOLDER')}
      />
      <Input
        {...register('passwordConfirm')}
        label={t('AUTH_FORM_PASSWORD_CONFIRMATION')}
        error={errors.passwordConfirm?.message}
        disabled={loading}
        type="password"
        className="mb-3"
        placeholder={t('AUTH_FORM_NEW_PASSWORD_CONFIRMATION_PLACEHOLDER')}
      />
      <Button loading={loading} type="submit" intent="primary" className="w-100">
        {t('AUTH_RESET_PASSWORD_SUBMIT')}
      </Button>
      <Button onClick={onCancel} type="button" intent="secondary" className="w-100 mt-3">
        {t('AUTH_RESET_PASSWORD_CANCEL')}
      </Button>
    </form>
  );
};
