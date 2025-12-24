import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { type } from 'arktype';
import type React from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

interface IProps {
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
  loading: boolean;
}

type FormValues = { password: string; passwordConfirm: string };

export const ResetPasswordForm: React.FC<IProps> = ({ onSubmit, loading, onCancel }) => {
  const { t } = useTranslation();

  const schema = type({
    password: type('string')
      .atLeastLength(8)
      .configure({ message: t('AUTH_FORM_ERROR_PASSWORD_LENGTH') }),
    passwordConfirm: type('string')
      .atLeastLength(8)
      .configure({ message: t('AUTH_FORM_ERROR_PASSWORD_CONFIRMATION_LENGTH') })
      .narrow((confirm, ctx) => confirm === (ctx.root as { password?: string }).password)
      .configure({ message: t('AUTH_FORM_ERROR_PASSWORD_CONFIRMATION_MATCH') }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: arktypeResolver(schema),
  });

  return (
    <>
      <h2 className="h2 text-center mb-4">{t('AUTH_RESET_PASSWORD_TITLE')}</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
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
        <div className="form-footer">
          <Button loading={loading} type="submit" intent="primary" className="w-100 mb-3">
            {t('AUTH_RESET_PASSWORD_SUBMIT')}
          </Button>
          <Button onClick={onCancel} type="button" variant="outline" intent="dark" className="w-100">
            {t('AUTH_RESET_PASSWORD_CANCEL')}
          </Button>
        </div>
      </form>
    </>
  );
};
