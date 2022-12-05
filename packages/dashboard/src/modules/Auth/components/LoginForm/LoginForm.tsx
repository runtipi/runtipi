import React from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

type FormValues = { email: string; password: string };

const schema = z.object({
  email: z.string().email(),
  password: z.string(),
});

interface IProps {
  onSubmit: (values: FormValues) => void;
  loading: boolean;
}

export const LoginForm: React.FC<IProps> = ({ loading, onSubmit }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const watchEmail = watch('email');
  const watchPassword = watch('password');

  const isDisabled = !watchEmail || !watchPassword;

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
      <h2 className="h2 text-center mb-3">Login to your account</h2>
      <Input {...register('email')} label="Email address" error={errors.email?.message} disabled={loading} type="email" className="mb-3" placeholder="you@example.com" />
      <Input {...register('password')} label="Password" error={errors.password?.message} disabled={loading} type="password" className="mb-3" placeholder="Your password" />
      <Button disabled={isDisabled} loading={loading} type="submit" className="btn btn-primary w-100">
        Login
      </Button>
    </form>
  );
};
