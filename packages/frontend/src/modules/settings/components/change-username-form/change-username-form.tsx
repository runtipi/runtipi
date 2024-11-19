import { changeUsernameMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { TranslatableError } from '@/types/error.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

type Props = {
  username?: string;
};

export const ChangeUsernameForm = ({ username }: Props) => {
  const changeUsernameDisclosure = useDisclosure();
  const { t } = useTranslation();
  const schema = z.object({
    newUsername: z.string().email(t('SETTINGS_SECURITY_CHANGE_USERNAME_FORM_INVALID_USERNAME')),
    password: z.string().min(1),
  });
  const formId = useId();
  type FormValues = z.infer<typeof schema>;

  const changeUsername = useMutation({
    ...changeUsernameMutation(),
    onSuccess: () => {
      toast.success(t('SETTINGS_SECURITY_CHANGE_USERNAME_SUCCESS'));
      changeUsernameDisclosure.close();
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (body: FormValues) => {
    changeUsername.mutate({ body });
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
            <form onSubmit={handleSubmit(onSubmit)} className="w-100" id={formId}>
              <p className="text-muted">{t('SETTINGS_SECURITY_CHANGE_USERNAME_FORM_PASSWORD_NEEDED_HINT')}</p>
              <Input
                error={formState.errors.newUsername?.message}
                disabled={changeUsername.isPending}
                type="email"
                placeholder={t('SETTINGS_SECURITY_CHANGE_USERNAME_FORM_NEW_USERNAME')}
                {...register('newUsername')}
              />
              <Input
                className="mt-2"
                error={formState.errors.password?.message}
                disabled={changeUsername.isPending}
                type="password"
                placeholder={t('SETTINGS_SECURITY_CHANGE_USERNAME_FORM_PASSWORD')}
                {...register('password')}
              />
            </form>
          </DialogDescription>
          <DialogFooter>
            <Button loading={changeUsername.isPending} type="submit" intent="success" form={formId}>
              {t('SETTINGS_SECURITY_CHANGE_USERNAME_FORM_SUBMIT')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
