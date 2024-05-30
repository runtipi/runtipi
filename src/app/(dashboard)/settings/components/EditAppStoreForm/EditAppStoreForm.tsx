import { editAppStoreAction } from '@/actions/settings/edit-app-store';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import React from 'react';

export const EditAppStoreForm = ({ appstore }: { appstore: string }) => {
  const t = useTranslations();

  const editAppStoreDisclosure = useDisclosure();
  const schema = z.object({
    newAppStoreUrl: z.string().url(),
  });

  type FormValues = z.infer<typeof schema>;

  const router = useRouter();

  const editAppStoreMutation = useAction(editAppStoreAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onSuccess: () => {
      toast.success(t('SETTINGS_APP_STORE_EDIT_SUCCESS'));
      editAppStoreDisclosure.close();
      router.refresh();
    },
  });

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (values: FormValues) => {
    editAppStoreMutation.execute({ newAppStoreUrl: values.newAppStoreUrl, appStoreUrl: appstore });
  };

  return (
    <>
      <Button className="mx-1" onClick={() => editAppStoreDisclosure.open()}>
        {t('SETTINGS_APP_STORE_EDIT_BUTTON')}
      </Button>
      <Dialog open={editAppStoreDisclosure.isOpen} onOpenChange={editAppStoreDisclosure.toggle}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_APP_STORE_EDIT_MODAL_TITLE')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <form onSubmit={handleSubmit(onSubmit)}>
              <p className="text-muted">{t('SETTINGS_APP_STORE_EDIT_MODAL_DESCRIPTION')}</p>
              <Input
                disabled={editAppStoreMutation.status === 'executing'}
                type="url"
                defaultValue={appstore}
                error={formState.errors.newAppStoreUrl?.message}
                {...register('newAppStoreUrl')}
              />
              <div className="mt-3">
                <Button loading={editAppStoreMutation.status === 'executing'} type="submit" className="btn-success me-2">
                  {t('SETTINGS_APP_STORE_EDIT_BUTTON')}
                </Button>
                <Button onClick={() => editAppStoreDisclosure.close()}>{t('SETTINGS_APP_STORE_CANCEL_BUTTON')}</Button>
              </div>
            </form>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};
