import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

interface IProps {
  onSubmit: (values: FormValues) => void;
  loading: boolean;
}

type FormValues = { email: string; password: string; passwordConfirm: string };

const schema = z
  .object({
    email: z.string().email(),
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

export const RegisterForm: React.FC<IProps> = ({ onSubmit, loading }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
      <h2 className="h2 text-center mb-3">Register your account</h2>
      <Input {...register('email')} label="Email address" error={errors.email?.message} disabled={loading} type="email" className="mb-3" placeholder="you@example.com" />
      <Input {...register('password')} label="Password" error={errors.password?.message} disabled={loading} type="password" className="mb-3" placeholder="Your password" />
      <Input
        {...register('passwordConfirm')}
        label="Confirm password"
        error={errors.passwordConfirm?.message}
        disabled={loading}
        type="password"
        className="mb-3"
        placeholder="Confirm your password"
      />
      <Button loading={loading} type="submit" className="btn btn-primary w-100">
        Register
      </Button>
    </form>
  );
};
