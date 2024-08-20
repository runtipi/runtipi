import { changePasswordAction } from '@/actions/settings/change-password';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

export const ChangePasswordForm = () => {
  const t = useTranslations();

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

  const router = useRouter();

  const changePasswordMutation = useAction(changePasswordAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onSuccess: () => {
      toast.success(t('SETTINGS_SECURITY_PASSWORD_CHANGE_SUCCESS'));
      router.refresh();
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (values: FormValues) => {
    changePasswordMutation.execute(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mb-4 w-100 ">
      <Input
        disabled={changePasswordMutation.status === 'executing'}
        {...register('currentPassword')}
        error={errors.currentPassword?.message}
        type="password"
        placeholder={t('SETTINGS_SECURITY_FORM_CURRENT_PASSWORD')}
      />
      <Input
        disabled={changePasswordMutation.status === 'executing'}
        {...register('newPassword')}
        error={errors.newPassword?.message}
        className="mt-2"
        type="password"
        placeholder={t('SETTINGS_SECURITY_FORM_NEW_PASSWORD')}
      />
      <Input
        disabled={changePasswordMutation.status === 'executing'}
        {...register('newPasswordConfirm')}
        error={errors.newPasswordConfirm?.message}
        className="mt-2"
        type="password"
        placeholder={t('SETTINGS_SECURITY_FORM_CONFIRM_PASSWORD')}
      />
      <Button disabled={changePasswordMutation.status === 'executing'} className="mt-3" type="submit">
        {t('SETTINGS_SECURITY_FORM_CHANGE_PASSWORD_SUBMIT')}
      </Button>
    </form>
  );
};
