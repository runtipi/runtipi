import { changePasswordMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { TranslatableError } from '@/types/error.types';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { useMutation } from '@tanstack/react-query';
import { type } from 'arktype';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const ChangePasswordForm = () => {
  const { t } = useTranslation();

  const schema = type({
    currentPassword: type('string').atLeastLength(1),
    newPassword: type('string')
      .atLeastLength(8)
      .configure({ message: t('SETTINGS_SECURITY_FORM_PASSWORD_LENGTH') }),
    newPasswordConfirm: type('string')
      .atLeastLength(8)
      .configure({ message: t('SETTINGS_SECURITY_FORM_PASSWORD_LENGTH') })
      // cross-field validation (match `newPassword`)
      .narrow((confirm, ctx) => confirm === (ctx.root as { newPassword?: string }).newPassword)
      .configure({ message: t('SETTINGS_SECURITY_FORM_PASSWORD_MATCH') }),
  });

  type FormValues = typeof schema.infer;

  const changePassword = useMutation({
    ...changePasswordMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onSuccess: () => {
      toast.success(t('SETTINGS_SECURITY_PASSWORD_CHANGE_SUCCESS'));
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: arktypeResolver(schema),
  });

  const onSubmit = (values: FormValues) => {
    changePassword.mutate({ body: values });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mb-4 w-100 ">
      <Input
        disabled={changePassword.isPending}
        {...register('currentPassword')}
        error={errors.currentPassword?.message}
        type="password"
        placeholder={t('SETTINGS_SECURITY_FORM_CURRENT_PASSWORD')}
      />
      <Input
        disabled={changePassword.isPending}
        {...register('newPassword')}
        error={errors.newPassword?.message}
        className="mt-2"
        type="password"
        placeholder={t('SETTINGS_SECURITY_FORM_NEW_PASSWORD')}
      />
      <Input
        disabled={changePassword.isPending}
        {...register('newPasswordConfirm')}
        error={errors.newPasswordConfirm?.message}
        className="mt-2"
        type="password"
        placeholder={t('SETTINGS_SECURITY_FORM_CONFIRM_PASSWORD')}
      />
      <Button disabled={changePassword.isPending} className="mt-3" type="submit">
        {t('SETTINGS_SECURITY_FORM_CHANGE_PASSWORD_SUBMIT')}
      </Button>
    </form>
  );
};
