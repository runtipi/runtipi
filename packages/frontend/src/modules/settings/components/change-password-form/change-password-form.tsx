import { changePasswordMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { TranslatableError } from '@/types/error.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

export const ChangePasswordForm = () => {
  const { t } = useTranslation();

  const schema = z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, t('SETTINGS_SECURITY_FORM_PASSWORD_LENGTH')),
      newPasswordConfirm: z.string().min(8, t('SETTINGS_SECURITY_FORM_PASSWORD_LENGTH')),
    })
    .superRefine((data, ctx) => {
      if (data.newPassword !== data.newPasswordConfirm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('SETTINGS_SECURITY_FORM_PASSWORD_MATCH'),
          path: ['newPasswordConfirm'],
        });
      }
    });

  type FormValues = z.infer<typeof schema>;

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
  } = useForm({
    resolver: zodResolver(schema),
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
