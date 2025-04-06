import { updateAppStoreMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { AppStore } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

type Props = {
  appStore: AppStore;
};

export const EditAppStoreDialog = ({ appStore }: Props) => {
  const editAppStoreDisclosure = useDisclosure();
  const { t } = useTranslation();

  const schema = z.object({
    name: z.string().max(16),
    enabled: z.boolean(),
  });

  type FormValues = z.infer<typeof schema>;

  const editAppStore = useMutation({
    ...updateAppStoreMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onSuccess: () => {
      editAppStoreDisclosure.close();
      toast.success(t('APP_STORE_EDIT_DIALOG_SUCCESS'));
    },
  });

  const { register, control, handleSubmit, formState } = useForm({
    resolver: zodResolver(schema),
    values: appStore,
  });

  const validate = (values: FormValues) => {
    editAppStore.mutate({ path: { id: appStore.slug }, body: values });
  };

  const formId = useId();

  return (
    <div>
      <Button loading={editAppStore.isPending} size="sm" variant="ghost" onClick={() => editAppStoreDisclosure.open()} className="me-2">
        {t('APP_STORE_TABLE_EDIT')}
      </Button>
      <Dialog open={editAppStoreDisclosure.isOpen} onOpenChange={editAppStoreDisclosure.toggle}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('APP_STORE_EDIT_DIALOG_TITLE')}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="d-flex flex-column">
            <form onSubmit={handleSubmit(validate)} id={formId}>
              <Input
                label="Name"
                className="mb-3"
                error={formState.errors.name?.message}
                disabled={editAppStore.isPending}
                type="text"
                placeholder={appStore.name}
                {...register('name')}
              />
              <Controller
                control={control}
                name="enabled"
                defaultValue={appStore.enabled}
                render={({ field: { onChange, value, ref, ...rest } }) => (
                  <Switch
                    className="mb-3"
                    ref={ref}
                    checked={Boolean(value)}
                    onCheckedChange={onChange}
                    {...rest}
                    label={t('APP_STORE_EDIT_DIALOG_ENABLED')}
                  />
                )}
              />
            </form>
          </DialogDescription>
          <DialogFooter>
            <Button loading={editAppStore.isPending} type="submit" intent="success" form={formId}>
              {t('APP_STORE_EDIT_DIALOG_SUBMIT')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
