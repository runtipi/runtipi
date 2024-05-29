import { addAppStoreAction } from '@/actions/settings/add-app-store';
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

export const AddAppStoreForm = () => {
  const t = useTranslations();

  const addAppStoreDisclosure = useDisclosure();
  const schema = z.object({
    appStoreUrl: z.string().url(),
  });

  type FormValues = z.infer<typeof schema>;

  const router = useRouter();

  const addAppStoreMutation = useAction(addAppStoreAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onSuccess: () => {
      toast.success(t('SETTINGS_APP_STORE_ADD_NEW_SUCCESS'));
      router.refresh();
    },
  });

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (values: FormValues) => {
    addAppStoreMutation.execute(values);
  };

  return (
    <>
      <Button onClick={() => addAppStoreDisclosure.open()}>{t('SETTINGS_APP_STORE_ADD_NEW_BUTTON')}</Button>
      <Dialog open={addAppStoreDisclosure.isOpen} onOpenChange={addAppStoreDisclosure.toggle}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_APP_STORE_ADD_NEW_MODAL_TITLE')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <form onSubmit={handleSubmit(onSubmit)}>
              <p className="text-muted">{t('SETTINGS_APP_STORE_ADD_NEW_MODAL_DESCRIPTION')}</p>
              <Input
                disabled={addAppStoreMutation.status === 'executing'}
                type="url"
                placeholder="https://github.com/runtipi/runtipi-appstore"
                error={formState.errors.appStoreUrl?.message}
                {...register('appStoreUrl')}
              />
              <div className="mt-3">
                <Button loading={addAppStoreMutation.status === 'executing'} type="submit" className="btn-success me-2">
                  {t('SETTINGS_APP_STORE_ADD_NEW_BUTTON')}
                </Button>
                <Button onClick={() => addAppStoreDisclosure.close()}>{t('SETTINGS_APP_STORE_CANCEL_BUTTON')}</Button>
              </div>
            </form>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};
