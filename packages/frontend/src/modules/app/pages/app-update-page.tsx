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
import { IconAlertTriangle, IconArrowRight, IconChevronLeft, IconChevronRight, IconInfoCircle } from '@tabler/icons-react';
import type { UpdateNoticeDto } from '@/api-client/types.gen';
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

/**
 * Returns the notice content for the given language, falling back to the
 * English reference fields for anything the translation omits. Tries the
 * exact locale (e.g. `fr-FR`) then its base language (`fr`).
 */
const localizeNotice = (notice: UpdateNoticeDto, language: string) => {
  const baseLanguage = language.split('-')[0] ?? language;
  const translation = notice.translations?.[language] ?? notice.translations?.[baseLanguage] ?? undefined;

  return {
    ...notice,
    title: translation?.title || notice.title,
    message: translation?.message || notice.message,
    before_update: translation?.before_update ?? notice.before_update,
    after_update: translation?.after_update ?? notice.after_update,
  };
};

const LoadingBlock = () => {
  const { t } = useTranslation();
  return <div className="mt-3 text-muted">{t('LOADING')}</div>;
};

export default function AppUpdatePage({ loaderData }: Route.ComponentProps) {
  const params = useParams<{ storeId: string; appId: string }>();
  const { t, i18n } = useTranslation();
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
  // Acknowledgements are bound to the notice snapshot they were given for:
  // if the target revision or the notice content changes (e.g. the catalog
  // refreshed), they are discarded and the warnings must be reviewed again.
  const [acknowledged, setAcknowledged] = useState<{ snapshotKey: string; ids: string[] }>({ snapshotKey: '', ids: [] });

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
    onSuccess: () => {
      navigate(`/apps/${storeId}/${appId}`);
    },
  });

  const newVersionLabel = useMemo(
    () => buildVersionLabel(metadata?.latestDockerVersion, metadata?.latestVersion),
    [metadata?.latestDockerVersion, metadata?.latestVersion],
  );

  const rawUpdateNotices = metadata?.updateNotices;
  const updateNotices = useMemo(
    () => (rawUpdateNotices ?? []).map((notice) => localizeNotice(notice, i18n.language)),
    [rawUpdateNotices, i18n.language],
  );

  const requiredNoticeIds = useMemo(() => updateNotices.filter((notice) => notice.require_confirmation).map((notice) => notice.id), [updateNotices]);
  const hasWarningsStep = updateNotices.length > 0;
  const noticesSnapshotKey = hasWarningsStep ? `${metadata?.latestVersion}:${metadata?.updateNoticesFingerprint}` : '';
  const acknowledgedNoticeIds = acknowledged.snapshotKey === noticesSnapshotKey ? acknowledged.ids : [];
  const allRequiredAcknowledged = requiredNoticeIds.every((id) => acknowledgedNoticeIds.includes(id));

  const toggleAcknowledged = (noticeId: string, checked: boolean) => {
    setAcknowledged((state) => {
      // Start from an empty list when the snapshot changed, so old
      // confirmations are not silently restored by checking one notice.
      const ids = state.snapshotKey === noticesSnapshotKey ? state.ids : [];

      return {
        snapshotKey: noticesSnapshotKey,
        ids: checked ? [...ids, noticeId] : ids.filter((id) => id !== noticeId),
      };
    });
  };

  const steps = useMemo(() => {
    return [
      ...(hasWarningsStep ? [{ id: 'warnings', title: t('APP_UPDATE_WARNINGS_TITLE') }] : []),
      { id: 'info', title: t('APP_UPDATE_INFORMATION_TITLE') },
      { id: 'config', title: t('APP_UPDATE_CONFIGURATION_TITLE') },
      ...(isComposeDifferent ? [{ id: 'compose', title: t('APP_UPDATE_COMPOSE_TITLE') }] : []),
      { id: 'backup', title: t('APP_UPDATE_BACKUP_TITLE') },
    ];
  }, [hasWarningsStep, isComposeDifferent, t]);

  const isLastStep = currentStep === steps.length - 1;
  const isWarningsStep = hasWarningsStep && currentStep === 0;

  // The step triggers only render a visual "disabled" state; navigation is
  // actually guarded here so unacknowledged warnings cannot be skipped.
  const handleStepChange = (step: number) => {
    if (hasWarningsStep && !allRequiredAcknowledged && step > 0) return;
    setCurrentStep(step);
  };

  const handleNextStep = () => {
    if (isWarningsStep && !allRequiredAcknowledged) return;
    setCurrentStep((step) => step + 1);
  };

  const handleSubmit = () => {
    update.mutate({
      path: { urn: info.urn },
      body: {
        performBackup: backupApp,
        // Only sent when the wizard displayed warnings; the backend recomputes
        // the applicable notices and enforces the acknowledgement.
        ...(hasWarningsStep
          ? {
              acknowledgedNoticeIds,
              targetTipiVersion: metadata?.latestVersion,
              noticesFingerprint: metadata?.updateNoticesFingerprint,
            }
          : {}),
      },
    });
  };

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
                <StepTrigger
                  key={step.id}
                  step={index}
                  title={step.title}
                  onStepChange={handleStepChange}
                  disabled={hasWarningsStep && !allRequiredAcknowledged && index > 0}
                />
              ))}
            </StepTriggerList>
            <div className="mt-1">
              {hasWarningsStep && (
                <StepContent step={0}>
                  <div className="text-muted">{t('APP_UPDATE_WARNINGS_SUBTITLE')}</div>
                  <ScrollArea maxheight={500} className="mt-3 border rounded p-3">
                    <div className="d-flex flex-column gap-4">
                      {updateNotices.map((notice) => (
                        <div key={notice.id} data-testid={`update-notice-${notice.id}`}>
                          <div className="d-flex align-items-center gap-2 mb-2">
                            {notice.severity === 'warning' ? (
                              <IconAlertTriangle className="text-warning" size={20} />
                            ) : (
                              <IconInfoCircle className="text-info" size={20} />
                            )}
                            <h3 className="h6 mb-0">{notice.title}</h3>
                          </div>
                          <p className="mb-2">{notice.message}</p>
                          {notice.before_update.length > 0 && (
                            <div className="mb-2">
                              <div className="fw-bold">{t('APP_UPDATE_WARNINGS_BEFORE')}</div>
                              <ul className="mb-0 ps-3">
                                {notice.before_update.map((instruction) => (
                                  <li key={instruction}>{instruction}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {notice.after_update.length > 0 && (
                            <div>
                              <div className="fw-bold">{t('APP_UPDATE_WARNINGS_AFTER')}</div>
                              <ul className="mb-0 ps-3">
                                {notice.after_update.map((instruction) => (
                                  <li key={instruction}>{instruction}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {notice.require_confirmation && (
                            <Switch
                              checked={acknowledgedNoticeIds.includes(notice.id)}
                              onCheckedChange={(checked) => toggleAcknowledged(notice.id, checked)}
                              label={t('APP_UPDATE_WARNINGS_ACKNOWLEDGE')}
                              className="mt-3 mb-0"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </StepContent>
              )}
              <StepContent step={steps.findIndex((s) => s.id === 'info')}>
                <div className="text-muted">
                  <Trans
                    t={t}
                    i18nKey="APP_UPDATE_INFORMATION_SUBTITLE"
                    components={{
                      name: <>{info.name}</>,
                      strong: <strong>{newVersionLabel}</strong>,
                    }}
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
                        value={yaml.stringify(JSON.parse(composeDiffQuery.data?.new ?? '{}'), { nullStr: '' }) ?? ''}
                        readOnly
                        height="400px"
                        theme={copilot}
                        extensions={[
                          unifiedMergeView({
                            original: yaml.stringify(JSON.parse(composeDiffQuery.data?.current ?? '{}'), { nullStr: '' }) ?? '',
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
              <Button
                variant="outline"
                onClick={handleNextStep}
                disabled={isWarningsStep && !allRequiredAcknowledged}
                data-testid="update-next-button"
              >
                {t('APP_UPDATE_FORM_NEXT')}
                <IconChevronRight className="ms-2 text-muted" size={12} />
              </Button>
            )}
            {isLastStep && (
              <Button
                onClick={handleSubmit}
                intent="success"
                loading={update.isPending}
                disabled={hasWarningsStep && !allRequiredAcknowledged}
                data-testid="update-submit-button"
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
