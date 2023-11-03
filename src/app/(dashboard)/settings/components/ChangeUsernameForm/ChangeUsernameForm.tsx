import React from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hook';
import { changeUsernameAction } from '@/actions/settings/change-username';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

type Props = {
  username?: string;
};

export const ChangeUsernameForm = ({ username }: Props) => {
  const router = useRouter();
  const changeUsernameDisclosure = useDisclosure();
  const t = useTranslations('settings.security');
  const schema = z.object({
    newUsername: z.string().email(t('change-username.form.invalid-username')),
    password: z.string().min(1),
  });
  type FormValues = z.infer<typeof schema>;

  const changeUsernameMutation = useAction(changeUsernameAction, {
    onSuccess: (data) => {
      if (!data.success) {
        toast.error(data.failure.reason);
      } else {
        toast.success(t('change-username.success'));
        router.push('/');
      }
    },
  });

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (values: FormValues) => {
    changeUsernameMutation.execute(values);
  };

  return (
    <div className="mb-4">
      <Input disabled type="email" value={username} />
      <Button className="mt-3" onClick={() => changeUsernameDisclosure.open()}>
        {t('change-username.form.submit')}
      </Button>
      <Dialog open={changeUsernameDisclosure.isOpen} onOpenChange={changeUsernameDisclosure.toggle}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('password-needed')}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="d-flex flex-column">
            <form onSubmit={handleSubmit(onSubmit)} className="w-100">
              <p className="text-muted">{t('change-username.form.password-needed-hint')}</p>
              <Input
                error={formState.errors.newUsername?.message}
                disabled={changeUsernameMutation.status === 'executing'}
                type="email"
                placeholder={t('change-username.form.new-username')}
                {...register('newUsername')}
              />
              <Input
                className="mt-2"
                error={formState.errors.password?.message}
                disabled={changeUsernameMutation.status === 'executing'}
                type="password"
                placeholder={t('form.password')}
                {...register('password')}
              />
              <Button loading={changeUsernameMutation.status === 'executing'} type="submit" className="btn-success mt-3">
                {t('change-username.form.submit')}
              </Button>
            </form>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
};
