import { getAppComposeDiffOptions, getAppConfigDiffOptions, getAppOptions, updateAppMutation } from '@/api-client/@tanstack/react-query.gen';
import { AppLogo } from '@/components/app-logo/app-logo';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { StepContent, Stepper, StepTrigger, StepTriggerList } from '@/components/ui/Stepper/Stepper';
import { Switch } from '@/components/ui/Switch';
import { unifiedMergeView } from '@codemirror/merge';
import { copilot } from '@uiw/codemirror-theme-copilot';
import CodeMirror from '@uiw/react-codemirror';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Trans, useTranslation } from 'react-i18next';
import { IconArrowRight, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import type { TranslatableError } from '@/types/error.types';
import { redirect, useLocation, useNavigate, useParams } from 'react-router';
import type { Route } from './+types/app-update-page';
import { getApp } from '@/api-client';
import yaml from 'yaml';

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  if (!params.appId || !params.storeId) {
    return redirect('/apps');
  }

  const appOptions = await getApp({ path: { urn: `${params.appId}:${params.storeId}` } });

  if (!appOptions.data) {
    return redirect('/apps');
  }

  return appOptions.data;
}

const buildVersionLabel = (latestDocker?: string | null, latestVersion?: string | number | null) => {
  return [latestDocker?.toString().trim(), latestVersion ? `(${String(latestVersion)})` : undefined].filter(Boolean).join(' ');
};

const LoadingBlock = () => {
  const { t } = useTranslation();
  return <div className="mt-3 text-muted">{t('LOADING')}</div>;
};

export default function AppUpdatePage({ loaderData }: Route.ComponentProps) {
  const params = useParams<{ storeId: string; appId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const storeId = params.storeId;
  const appId = params.appId;

  const { data: appData } = useQuery({
    ...getAppOptions({ path: { urn: `${appId}:${storeId}` } }),
    initialData: loaderData,
  });

  const { info, metadata } = appData;

  const [backupApp, setBackupApp] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  const configDiffQuery = useQuery({
    ...getAppConfigDiffOptions({ path: { urn: info.urn } }),
  });

  const composeDiffQuery = useQuery({
    ...getAppComposeDiffOptions({ path: { urn: info.urn } }),
  });

  const isComposeDifferent = composeDiffQuery.data?.new !== composeDiffQuery.data?.current;

  const update = useMutation({
    ...updateAppMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onMutate: () => {
      navigate(location.state?.from || '/apps');
    },
  });

  const newVersionLabel = useMemo(
    () => buildVersionLabel(metadata?.latestDockerVersion, metadata?.latestVersion),
    [metadata?.latestDockerVersion, metadata?.latestVersion],
  );

  const steps = useMemo(() => {
    return [
      { id: 'info', title: t('APP_UPDATE_INFORMATION_TITLE') },
      { id: 'config', title: t('APP_UPDATE_CONFIGURATION_TITLE') },
      ...(isComposeDifferent ? [{ id: 'compose', title: t('APP_UPDATE_COMPOSE_TITLE') }] : []),
      { id: 'backup', title: t('APP_UPDATE_BACKUP_TITLE') },
    ];
  }, [isComposeDifferent, t]);

  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="card" data-testid="app-update">
      <div className="card-header border-0 pb-0">
        <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center border-bottom pb-3 w-100">
          <AppLogo urn={info.urn} size={96} alt={info.name} />
          <div className="mt-3 mt-lg-0 ms-lg-3">
            <h2 className="mb-1">{t('APP_UPDATE_FORM_TITLE', { name: info.name })}</h2>
            <div className="d-flex flex-wrap align-items-center gap-2 text-muted">
              <span className="badge bg-muted text-white">{info.version}</span>
              <IconArrowRight size={16} />
              <span className="badge bg-success text-white">{metadata.latestDockerVersion}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="card-body pt-2 pb-0">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Stepper currentStep={currentStep}>
            <StepTriggerList>
              {steps.map((step, index) => (
                <StepTrigger key={step.id} step={index} title={step.title} onStepChange={setCurrentStep} />
              ))}
            </StepTriggerList>
            <div className="mt-1">
              <StepContent step={steps.findIndex((s) => s.id === 'info')}>
                <div className="text-muted">
                  <Trans
                    t={t}
                    i18nKey="APP_UPDATE_INFORMATION_SUBTITLE"
                    values={{
                      version: newVersionLabel,
                      name: info.name,
                    }}
                    components={{ strong: <strong /> }}
                  />
                </div>
              </StepContent>
              <StepContent step={steps.findIndex((s) => s.id === 'config')}>
                <div className="text-muted">{t('APP_UPDATE_CONFIGURATION_SUBTITLE')}</div>
                {configDiffQuery.isLoading && <LoadingBlock />}
                {!configDiffQuery.isLoading && (
                  <ScrollArea maxheight={500} className="mt-3 border rounded">
                    <CodeMirror
                      value={configDiffQuery.data?.new ?? ''}
                      readOnly
                      height="400px"
                      theme={copilot}
                      extensions={[
                        unifiedMergeView({
                          original: configDiffQuery.data?.current ?? '',
                          mergeControls: false,
                        }),
                      ]}
                    />
                  </ScrollArea>
                )}
              </StepContent>
              {isComposeDifferent && (
                <StepContent step={steps.findIndex((s) => s.id === 'compose')}>
                  <div className="text-muted">{t('APP_UPDATE_COMPOSE_SUBTITLE')}</div>
                  {composeDiffQuery.isLoading && <LoadingBlock />}
                  {!composeDiffQuery.isLoading && (
                    <ScrollArea maxheight={500} className="mt-3 border rounded">
                      <CodeMirror
                        value={yaml.stringify(JSON.parse(composeDiffQuery.data?.new ?? '{}')) ?? ''}
                        readOnly
                        height="400px"
                        theme={copilot}
                        extensions={[
                          unifiedMergeView({
                            original: yaml.stringify(JSON.parse(composeDiffQuery.data?.current ?? '{}')) ?? '',
                            mergeControls: false,
                          }),
                        ]}
                      />
                    </ScrollArea>
                  )}
                </StepContent>
              )}
              <StepContent step={steps.findIndex((s) => s.id === 'backup')}>
                <div className="text-muted">{t('APP_UPDATE_BACKUP_SUBTITLE')}</div>
                <Switch checked={backupApp} onCheckedChange={setBackupApp} label={t('APP_UPDATE_FORM_BACKUP')} className="mt-3 mb-0" />
              </StepContent>
            </div>
          </Stepper>
        </motion.div>
      </div>
      <div className="card-footer border-0">
        <div className="d-flex align-items-center justify-content-between gap-3 pt-3 border-top">
          <Button onClick={() => navigate(location.state?.from || '/apps')}>
            <IconChevronLeft className="me-1" size={16} />
            {t('APP_ACTION_CANCEL')}
          </Button>
          <div className="d-flex align-items-center justify-content-end gap-2">
            {currentStep > 0 && (
              <Button onClick={() => setCurrentStep((step) => step - 1)} className="me-2">
                {t('APP_UPDATE_FORM_BACK')}
              </Button>
            )}
            {!isLastStep && (
              <Button variant="outline" onClick={() => setCurrentStep((step) => step + 1)}>
                {t('APP_UPDATE_FORM_NEXT')}
                <IconChevronRight className="ms-2 text-muted" size={12} />
              </Button>
            )}
            {isLastStep && (
              <Button
                onClick={() =>
                  update.mutate({
                    path: { urn: info.urn },
                    body: { performBackup: backupApp },
                  })
                }
                intent="success"
                loading={update.isPending}
              >
                {t('APP_UPDATE_FORM_SUBMIT')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
