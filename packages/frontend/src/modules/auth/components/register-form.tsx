import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { zodResolver } from '@hookform/resolvers/zod';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

interface IProps {
  onSubmit: (values: FormValues) => void;
  loading: boolean;
}

type FormValues = { email: string; password: string; passwordConfirm: string };

export const RegisterForm: React.FC<IProps> = ({ onSubmit, loading }) => {
  const { t } = useTranslation();
  const schema = z
    .object({
      email: z.string().email(),
      password: z.string().min(8, t('AUTH_ERROR_INVALID_PASSWORD_LENGTH')),
      passwordConfirm: z.string().min(8, t('AUTH_ERROR_INVALID_PASSWORD_LENGTH')),
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
  } = useForm({
    resolver: zodResolver(schema),
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
