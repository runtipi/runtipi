import { installAppMutation } from '@/api-client/@tanstack/react-query.gen';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useAppStatus } from '@/modules/app/helpers/use-app-status';
import type { AppInfo } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import type React from 'react';
import { useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { FormValues } from '../install-form/install-form';
import { AppConfigurationStep } from './steps/AppConfigurationStep';
import { NetworkAccessStep } from './steps/NetworkAccessStep';
import { ReviewStep } from './steps/ReviewStep';
import { ReverseProxyStep } from './steps/ReverseProxyStep';
import { WizardNavigation } from './WizardNavigation';
import { WizardProvider } from './WizardContext';
import { hiddenTypes } from '../install-form/form-validators';

interface AppInstallWizardProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
}

const AppInstallWizardContent: React.FC<AppInstallWizardProps> = ({ info, isOpen, onClose }) => {
  const { t } = useTranslation();
  const { setOptimisticStatus } = useAppStatus();
  const formId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    control,
  } = useForm<FormValues>({});

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

  // Set default values when app info changes
  useEffect(() => {
    if (info.force_expose) {
      setValue('exposed', true);
    }
  }, [info.force_expose, setValue]);

  const handleFinish = () => {
    handleSubmit((data) => {
      installMutation.mutate({
        path: { urn: info.urn },
        body: normalizeFormValues(data),
      });
    })();
  };

  // Calculate step indices statically based on app configuration
  const getStepIndices = () => {
    let stepIndex = 0;
    const indices: Record<string, number> = {};

    // App Configuration Step
    const hasCustomFields = (info.form_fields?.filter((field) => !hiddenTypes.includes(field.type)).length || 0) > 0;

    if (hasCustomFields) {
      indices.appConfig = stepIndex++;
    }

    // Network Access Step
    if (info.dynamic_config || info.port) {
      indices.networkAccess = stepIndex++;
    }

    // Reverse Proxy Step
    if (Boolean(info.port) && (info.exposable || info.dynamic_config)) {
      indices.reverseProxy = stepIndex++;
    }

    // Review Step - Always present
    indices.review = stepIndex;

    return indices;
  };

  const stepIndices = getStepIndices();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{t('APP_INSTALL_FORM_TITLE', { name: info.name })}</DialogTitle>
        </DialogHeader>

        <ScrollArea maxheight={500}>
          <DialogDescription>
            <form id={formId} onSubmit={handleSubmit(handleFinish)}>
              {/* App Configuration Step */}
              {stepIndices.appConfig !== undefined && (
                <AppConfigurationStep
                  stepIndex={stepIndices.appConfig}
                  info={info}
                  formFields={info.form_fields || []}
                  register={register}
                  control={control}
                  errors={errors}
                  loading={installMutation.isPending}
                />
              )}

              {/* Network Access Step */}
              {stepIndices.networkAccess !== undefined && (
                <NetworkAccessStep
                  stepIndex={stepIndices.networkAccess}
                  info={info}
                  register={register}
                  control={control}
                  errors={errors}
                  loading={installMutation.isPending}
                  setValue={setValue}
                />
              )}

              {/* Reverse Proxy Step */}
              {stepIndices.reverseProxy !== undefined && (
                <ReverseProxyStep
                  stepIndex={stepIndices.reverseProxy}
                  info={info}
                  register={register}
                  control={control}
                  errors={errors}
                  loading={installMutation.isPending}
                />
              )}

              {/* Review Step - Always present */}
              <ReviewStep stepIndex={stepIndices.review ?? 0} info={info} formFields={info.form_fields || []} control={control} />
            </form>
          </DialogDescription>
        </ScrollArea>

        <DialogFooter>
          <WizardNavigation onCancel={onClose} onFinish={handleFinish} isFinishing={installMutation.isPending} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const AppInstallWizard: React.FC<AppInstallWizardProps> = (props) => {
  // Calculate total steps for the wizard provider
  const getStepCount = () => {
    let stepCount = 1; // Review step is always present

    // App Configuration Step
    const hasCustomFields = (props.info.form_fields?.filter((field) => !['random'].includes(field.type)).length || 0) > 0;
    if (hasCustomFields) {
      stepCount++;
    }

    // Network Access Step
    if (props.info.dynamic_config || props.info.port) {
      stepCount++;
    }

    // Reverse Proxy Step
    if (Boolean(props.info.port) && (props.info.exposable || props.info.dynamic_config)) {
      stepCount++;
    }

    return stepCount;
  };

  const totalSteps = getStepCount();

  return (
    <WizardProvider totalSteps={totalSteps}>
      <AppInstallWizardContent {...props} />
    </WizardProvider>
  );
};
