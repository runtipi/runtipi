import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

interface IProps {
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
  loading: boolean;
}

type FormValues = { password: string; passwordConfirm: string };

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    passwordConfirm: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.passwordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['passwordConfirm'],
      });
    }
  });

export const ResetPasswordForm: React.FC<IProps> = ({ onSubmit, loading, onCancel }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
      <h2 className="h2 text-center mb-3">Reset your password</h2>
      <Input {...register('password')} label="Password" error={errors.password?.message} disabled={loading} type="password" className="mb-3" placeholder="Your new password" />
      <Input
        {...register('passwordConfirm')}
        label="Confirm password"
        error={errors.passwordConfirm?.message}
        disabled={loading}
        type="password"
        className="mb-3"
        placeholder="Confirm your new password"
      />
      <Button loading={loading} type="submit" className="btn btn-primary w-100">
        Reset password
      </Button>
      <Button onClick={onCancel} type="button" className="btn btn-secondary w-100 mt-3">
        Cancel password change request
      </Button>
    </form>
  );
};
