import { createAppStoreMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { TranslatableError } from '@/types/error.types';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { useMutation } from '@tanstack/react-query';
import { type } from 'arktype';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const AddAppStoreDialog = () => {
  const { t } = useTranslation();
  const addAppStoreDisclosure = useDisclosure();

  const schema = type({
    name: 'string <= 16',
    url: 'string.url',
  });

  type FormValues = typeof schema.infer;

  const { register, reset, handleSubmit, formState } = useForm<FormValues>({
    resolver: arktypeResolver(schema),
  });

  const createAppStore = useMutation({
    ...createAppStoreMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onSuccess: () => {
      toast.success(t('APP_STORE_ADD_SUCCESS'));
      addAppStoreDisclosure.close();
      reset();
    },
  });

  const onSubmit = (values: FormValues) => {
    createAppStore.mutate({ body: values });
  };

  const formId = useId();

  return (
    <div className="mt-3 align-self-end">
      <Button onClick={() => addAppStoreDisclosure.open()} intent="primary">
        {t('APP_STORE_ADD_BUTTON')}
      </Button>
      <Dialog open={addAppStoreDisclosure.isOpen} onOpenChange={addAppStoreDisclosure.toggle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('APP_STORE_ADD_DIALOG_TITLE')}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="d-flex flex-column">
            <form onSubmit={handleSubmit(onSubmit)} id={formId}>
              <Input
                label={t('APP_STORE_ADD_FORM_NAME')}
                error={formState.errors.name?.message}
                disabled={createAppStore.isPending}
                type="text"
                placeholder="my-awesome-repo"
                {...register('name')}
              />
              <Input
                label={t('APP_STORE_ADD_FORM_URL')}
                className="mt-3"
                error={formState.errors.url?.message}
                disabled={createAppStore.isPending}
                type="text"
                placeholder="https://github.com/myusername/my-awesome-repo"
                {...register('url')}
              />
            </form>
          </DialogDescription>
          <DialogFooter>
            <Button loading={createAppStore.isPending} type="submit" intent="success" form={formId}>
              {t('APP_STORE_ADD_FORM_SUBMIT')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
