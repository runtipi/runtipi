import React from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { trpc } from '@/utils/trpc';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    newPasswordConfirm: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.newPasswordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['newPasswordConfirm'],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export const ChangePasswordForm = () => {
  const router = useRouter();
  const changePassword = trpc.auth.changePassword.useMutation({
    onError: (e) => {
      toast.error(`Error changing password: ${e.message}`);
    },
    onSuccess: () => {
      toast.success('Password successfully changed');
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
      <Input disabled={changePassword.isLoading} {...register('currentPassword')} error={errors.currentPassword?.message} type="password" placeholder="Current password" />
      <Input disabled={changePassword.isLoading} {...register('newPassword')} error={errors.newPassword?.message} className="mt-2" type="password" placeholder="New password" />
      <Input disabled={changePassword.isLoading} {...register('newPasswordConfirm')} error={errors.newPasswordConfirm?.message} className="mt-2" type="password" placeholder="Confirm new password" />
      <Button disabled={changePassword.isLoading} className="mt-3" type="submit">
        Change password
      </Button>
    </form>
  );
};
