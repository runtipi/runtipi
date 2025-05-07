import { installAppMutation } from '@/api-client/@tanstack/react-query.gen';
import { Alert, AlertDescription, AlertHeading, AlertIcon } from '@/components/ui/Alert/Alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useAppStatus } from '@/modules/app/helpers/use-app-status';
import type { AppInfo } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import type React from 'react';
import { useId } from 'react';
import toast from 'react-hot-toast';
import { Trans, useTranslation } from 'react-i18next';
import { InstallFormButtons } from '../../install-form-buttons/install-form-buttons';
import { type FormValues, InstallForm } from '../../install-form/install-form';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const InstallDialog: React.FC<IProps> = ({ info, isOpen, onClose }) => {
  const { t } = useTranslation();
  const { setOptimisticStatus } = useAppStatus();
  const formId = useId();

  const installMutation = useMutation({
    ...installAppMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onMutate: () => {
      setOptimisticStatus('installing', info.urn);
      onClose();
    },
  });

  const normalizeFormValues = (values: FormValues) => {
    return {
      ...values,
      port: values.port ? Number(values.port) : undefined,
      localSubdomain: values.localSubdomain || undefined,
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('APP_INSTALL_FORM_TITLE', { name: info.name })}</DialogTitle>
        </DialogHeader>
        <ScrollArea maxheight={500}>
          <DialogDescription>
            {info.force_pull && (
              <Alert variant="warning">
                <AlertIcon>
                  <IconAlertCircle stroke={2} />
                </AlertIcon>
                <div>
                  <AlertHeading>{t('WARNING')}</AlertHeading>
                  <AlertDescription>
                    <Trans i18nKey={'APP_INSTALL_FORM_FORCE_PULL_WARNING'} values={{ tag: info.version }} components={{ code: <code /> }} />
                  </AlertDescription>
                </div>
              </Alert>
            )}
            <InstallForm
              onSubmit={(data) => installMutation.mutate({ path: { urn: info.urn }, body: normalizeFormValues(data) })}
              formFields={info.form_fields}
              info={info}
              formId={formId}
            />
          </DialogDescription>
        </ScrollArea>
        <DialogFooter>
          <InstallFormButtons loading={installMutation.isPending} formId={formId} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
