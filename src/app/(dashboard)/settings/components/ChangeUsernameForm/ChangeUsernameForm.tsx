import React from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
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
  const t = useTranslations();
  const schema = z.object({
    newUsername: z.string().email(t('SETTINGS_SECURITY_CHANGE_USERNAME_FORM_INVALID_USERNAME')),
    password: z.string().min(1),
  });
  type FormValues = z.infer<typeof schema>;

  const changeUsernameMutation = useAction(changeUsernameAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onSuccess: () => {
      toast.success(t('SETTINGS_SECURITY_CHANGE_USERNAME_SUCCESS'));
      router.refresh();
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
        {t('SETTINGS_SECURITY_CHANGE_USERNAME_TITLE')}
      </Button>
      <Dialog open={changeUsernameDisclosure.isOpen} onOpenChange={changeUsernameDisclosure.toggle}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_SECURITY_CHANGE_USERNAME_FORM_PASSWORD')}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="d-flex flex-column">
            <form onSubmit={handleSubmit(onSubmit)} className="w-100">
              <p className="text-muted">{t('SETTINGS_SECURITY_CHANGE_USERNAME_FORM_PASSWORD_NEEDED_HINT')}</p>
              <Input
                error={formState.errors.newUsername?.message}
                disabled={changeUsernameMutation.status === 'executing'}
                type="email"
                placeholder={t('SETTINGS_SECURITY_CHANGE_USERNAME_FORM_NEW_USERNAME')}
                {...register('newUsername')}
              />
              <Input
                className="mt-2"
                error={formState.errors.password?.message}
                disabled={changeUsernameMutation.status === 'executing'}
                type="password"
                placeholder={t('SETTINGS_SECURITY_CHANGE_USERNAME_FORM_PASSWORD')}
                {...register('password')}
              />
              <Button loading={changeUsernameMutation.status === 'executing'} type="submit" className="btn-success mt-3">
                {t('SETTINGS_SECURITY_CHANGE_USERNAME_FORM_SUBMIT')}
              </Button>
            </form>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
};
