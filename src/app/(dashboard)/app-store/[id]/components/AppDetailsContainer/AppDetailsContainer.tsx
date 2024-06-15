import React from 'react';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { useAction } from 'next-safe-action/hooks';
import { installAppAction } from '@/actions/app-actions/install-app-action';
import { uninstallAppAction } from '@/actions/app-actions/uninstall-app-action';
import { stopAppAction } from '@/actions/app-actions/stop-app-action';
import { restartAppAction } from '@/actions/app-actions/restart-app-action';
import { startAppAction } from '@/actions/app-actions/start-app-action';
import { updateAppAction } from '@/actions/app-actions/update-app-action';
import { updateAppConfigAction } from '@/actions/app-actions/update-app-config-action';
import { AppLogo } from '@/components/AppLogo';
import { AppStatus } from '@/components/AppStatus';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { resetAppAction } from '@/actions/app-actions/reset-app-action';
import { AppStatus as AppStatusEnum } from '@/server/db/schema';
import { InstallModal } from '../InstallModal';
import { StopModal } from '../StopModal';
import { RestartModal } from '../RestartModal';
import { UninstallModal } from '../UninstallModal';
import { UpdateModal } from '../UpdateModal';
import { UpdateSettingsModal } from '../UpdateSettingsModal/UpdateSettingsModal';
import { AppActions } from '../AppActions';
import { AppDetailsTabs } from '../AppDetailsTabs';
import { ResetAppModal } from '../ResetAppModal';
import { GetAppCommand } from '@/server/services/app-catalog/commands';

type OpenType = 'local' | 'domain' | 'local_domain';

type AppDetailsContainerProps = {
  app: Awaited<ReturnType<GetAppCommand['execute']>>;
  localDomain?: string;
  optimisticStatus: AppStatusEnum;
  setOptimisticStatus: (status: AppStatusEnum) => void;
};

export const AppDetailsContainer: React.FC<AppDetailsContainerProps> = ({ app, localDomain, optimisticStatus, setOptimisticStatus }) => {
  const t = useTranslations();

  const installDisclosure = useDisclosure();
  const uninstallDisclosure = useDisclosure();
  const stopDisclosure = useDisclosure();
  const restartDisclosure = useDisclosure();
  const updateDisclosure = useDisclosure();
  const updateSettingsDisclosure = useDisclosure();
  const resetAppDisclosure = useDisclosure();

  const installMutation = useAction(installAppAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onExecute: () => {
      setOptimisticStatus('installing');
      installDisclosure.close();
    },
  });

  const uninstallMutation = useAction(uninstallAppAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onExecute: () => {
      uninstallDisclosure.close();
      setOptimisticStatus('uninstalling');
    },
  });

  const stopMutation = useAction(stopAppAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onExecute: () => {
      stopDisclosure.close();
      setOptimisticStatus('stopping');
    },
  });

  const restartMutation = useAction(restartAppAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onExecute: () => {
      restartDisclosure.close();
      setOptimisticStatus('restarting');
    },
  });

  const startMutation = useAction(startAppAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onExecute: () => {
      setOptimisticStatus('starting');
    },
  });

  const updateMutation = useAction(updateAppAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onExecute: () => {
      updateDisclosure.close();
      setOptimisticStatus('updating');
    },
  });

  const updateConfigMutation = useAction(updateAppConfigAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onExecute: () => {
      updateSettingsDisclosure.close();
    },
    onSuccess: () => {
      toast.success(t('APP_UPDATE_CONFIG_SUCCESS'));
    },
  });

  const resetMutation = useAction(resetAppAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onExecute: () => {
      resetAppDisclosure.close();
      setOptimisticStatus('resetting');
    },
  });

  const updateAvailable = Number(app.version || 0) < Number(app?.latestVersion || 0);

  const openResetAppModal = () => {
    updateSettingsDisclosure.close();

    setTimeout(() => {
      resetAppDisclosure.open();
    }, 300);
  };

  const handleOpen = (type: OpenType) => {
    let url = '';
    const { https } = app.info;
    const protocol = https ? 'https' : 'http';

    if (typeof window !== 'undefined') {
      // Current domain
      const domain = window.location.hostname;
      url = `${protocol}://${domain}:${app.info.port}${app.info.url_suffix || ''}`;
    }

    if (type === 'domain' && app.domain) {
      url = `https://${app.domain}${app.info.url_suffix || ''}`;
    }

    if (type === 'local_domain') {
      url = `https://${app.id}.${localDomain}`;
    }

    window.open(url, '_blank', 'noreferrer');
  };

  const newVersion = [app?.latestDockerVersion ? `${app?.latestDockerVersion}` : '', `(${String(app?.latestVersion)})`].join(' ');

  return (
    <div className="card" data-testid="app-details">
      <InstallModal
        onSubmit={(values) => installMutation.execute({ id: app.id, form: values })}
        isOpen={installDisclosure.isOpen}
        onClose={installDisclosure.close}
        info={app.info}
      />
      <StopModal
        onConfirm={() => stopMutation.execute({ id: app.id })}
        isOpen={stopDisclosure.isOpen}
        onClose={stopDisclosure.close}
        info={app.info}
      />
      <RestartModal
        onConfirm={() => restartMutation.execute({ id: app.id })}
        isOpen={restartDisclosure.isOpen}
        onClose={restartDisclosure.close}
        info={app.info}
      />
      <UninstallModal
        onConfirm={() => uninstallMutation.execute({ id: app.id })}
        isOpen={uninstallDisclosure.isOpen}
        onClose={uninstallDisclosure.close}
        info={app.info}
      />
      <UpdateModal
        onConfirm={() => updateMutation.execute({ id: app.id })}
        isOpen={updateDisclosure.isOpen}
        onClose={updateDisclosure.close}
        info={app.info}
        newVersion={newVersion}
      />
      <ResetAppModal
        onConfirm={() => resetMutation.execute({ id: app.id })}
        isOpen={resetAppDisclosure.isOpen}
        onClose={resetAppDisclosure.close}
        info={app.info}
        isLoading={resetMutation.status === 'executing'}
      />
      <UpdateSettingsModal
        onSubmit={(values) => updateConfigMutation.execute({ id: app.id, form: values })}
        isOpen={updateSettingsDisclosure.isOpen}
        onClose={updateSettingsDisclosure.close}
        info={app.info}
        config={castAppConfig(app?.config)}
        onReset={openResetAppModal}
        status={optimisticStatus}
      />
      <div className="card-header d-flex flex-column flex-md-row">
        <AppLogo id={app.id} size={130} alt={app.info.name} />
        <div className="w-100 d-flex flex-column ms-md-3 align-items-center align-items-md-start">
          <div>
            <span className="mt-1 me-1">{t('APP_DETAILS_VERSION')}: </span>
            <span className="badge bg-muted mt-2 text-white">{app.info.version}</span>
          </div>
          <span className="mt-1 text-muted text-center text-md-start mb-2">{app.info.short_desc}</span>
          <div className="mb-1">{optimisticStatus !== 'missing' && <AppStatus status={optimisticStatus} />}</div>
          <AppActions
            localDomain={localDomain}
            updateAvailable={updateAvailable}
            onUpdate={updateDisclosure.open}
            onUpdateSettings={updateSettingsDisclosure.open}
            onStop={stopDisclosure.open}
            onRestart={restartDisclosure.open}
            onCancel={stopDisclosure.open}
            onUninstall={uninstallDisclosure.open}
            onInstall={installDisclosure.open}
            onOpen={handleOpen}
            onStart={() => startMutation.execute({ id: app.id })}
            app={app}
            status={optimisticStatus}
          />
        </div>
      </div>
      <AppDetailsTabs info={app.info} status={optimisticStatus} />
    </div>
  );
};
