import React from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { trpc } from '@/utils/trpc';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import type { MessageKey } from '@/server/utils/errors';

export const ChangePasswordForm = () => {
  const globalT = useTranslations();
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
  const changePassword = trpc.auth.changePassword.useMutation({
    onError: (e) => {
      toast.error(globalT(e.data?.tError.message as MessageKey, { ...e.data?.tError?.variables }));
    },
    onSuccess: () => {
      toast.success(t('password-change-success'));
      router.push('/');
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
    changePassword.mutate(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mb-4 w-100 ">
      <Input disabled={changePassword.isLoading} {...register('currentPassword')} error={errors.currentPassword?.message} type="password" placeholder={t('form.current-password')} />
      <Input disabled={changePassword.isLoading} {...register('newPassword')} error={errors.newPassword?.message} className="mt-2" type="password" placeholder={t('form.new-password')} />
      <Input
        disabled={changePassword.isLoading}
        {...register('newPasswordConfirm')}
        error={errors.newPasswordConfirm?.message}
        className="mt-2"
        type="password"
        placeholder={t('form.confirm-password')}
      />
      <Button disabled={changePassword.isLoading} className="mt-3" type="submit">
        {t('form.change-password')}
      </Button>
    </form>
  );
};
