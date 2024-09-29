import { restartAction } from '@/actions/settings/restart-action';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import { z } from 'zod';
import { useId } from 'react';

export const RestartModal = () => {
  const t = useTranslations();
  const restartDisclosure = useDisclosure();
  const formId = useId();

  const schema = z.object({
    noPermissions: z.boolean().default(false),
    envFile: z.boolean().default(false),
    envFilePath: z.string(),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<FormValues>({});

  const watchEnv = watch('envFile', false);

  const restartMutation = useAction(restartAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onSettled: () => {
      restartDisclosure.close();
    },
  });

  const onSubmit = (values: FormValues) => {
    restartMutation.execute(values);
  };

  return (
    <div>
      <Button onClick={() => restartDisclosure.open()}>{t('SETTINGS_ACTIONS_RESTART')}</Button>
      <Dialog open={restartDisclosure.isOpen} onOpenChange={restartDisclosure.toggle}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_ACTIONS_RESTART')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <span className="text-muted">{t('SETTINGS_ACTIONS_RESTART_SUBTITLE')}</span>
            <form id={formId} className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
              <Controller
                control={control}
                name="noPermissions"
                defaultValue={false}
                render={({ field: { onChange, value, ref, ...props } }) => (
                  <Switch
                    {...props}
                    className="mt-3 mb-3"
                    ref={ref}
                    checked={value}
                    onCheckedChange={onChange}
                    label={
                      <>
                        No Permissions
                        <Tooltip className="tooltip" anchorSelect=".no-permissions-hint">
                          Enable this to pass the --no-permissions flag to the cli when restarting
                        </Tooltip>
                        <span className={clsx('ms-1 form-help no-permissions-hint')}>?</span>
                      </>
                    }
                  />
                )}
              />
              <Controller
                control={control}
                name="envFile"
                defaultValue={false}
                render={({ field: { onChange, value, ref, ...props } }) => (
                  <Switch
                    {...props}
                    className="mb-3"
                    ref={ref}
                    checked={value}
                    onCheckedChange={onChange}
                    label={
                      <>
                        Environment File
                        <Tooltip className="tooltip" anchorSelect=".env-file-hint">
                          Enable this to use a custom environment file when restarting
                        </Tooltip>
                        <span className={clsx('ms-1 form-help env-file-hint')}>?</span>
                      </>
                    }
                  />
                )}
              />
              {watchEnv && (
                <div className="mb-3">
                  <Input
                    {...register('envFilePath')}
                    label="Environment file path"
                    error={errors.envFilePath?.message}
                    placeholder="/some/path/.env"
                  />
                </div>
              )}
            </form>
          </DialogDescription>
          <DialogFooter>
            <Button intent="danger" loading={restartMutation.isExecuting} type="submit" form={formId}>
              {t('SETTINGS_ACTIONS_RESTART')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
