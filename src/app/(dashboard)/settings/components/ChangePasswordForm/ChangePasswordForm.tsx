import React from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hook';
import { changePasswordAction } from '@/actions/settings/change-password';

export const ChangePasswordForm = () => {
  const t = useTranslations('settings.security');

  const schema = z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, t('form.password-length')),
      newPasswordConfirm: z.string().min(8, t('form.password-length')),
    })
    .superRefine((data, ctx) => {
      if (data.newPassword !== data.newPasswordConfirm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('form.password-match'),
          path: ['newPasswordConfirm'],
        });
      }
    });

  type FormValues = z.infer<typeof schema>;

  const router = useRouter();

  const changePasswordMutation = useAction(changePasswordAction, {
    onSuccess: (data) => {
      if (!data.success) {
        toast.error(data.failure.reason);
      } else {
        toast.success(t('password-change-success'));
        router.push('/');
      }
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
      <Input disabled={changePasswordMutation.isExecuting} {...register('currentPassword')} error={errors.currentPassword?.message} type="password" placeholder={t('form.current-password')} />
      <Input disabled={changePasswordMutation.isExecuting} {...register('newPassword')} error={errors.newPassword?.message} className="mt-2" type="password" placeholder={t('form.new-password')} />
      <Input
        disabled={changePasswordMutation.isExecuting}
        {...register('newPasswordConfirm')}
        error={errors.newPasswordConfirm?.message}
        className="mt-2"
        type="password"
        placeholder={t('form.confirm-password')}
      />
      <Button disabled={changePasswordMutation.isExecuting} className="mt-3" type="submit">
        {t('form.change-password')}
      </Button>
    </form>
  );
};
