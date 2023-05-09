import React from 'react';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import type { MessageKey } from '@/server/utils/errors';
import { useDisclosure } from '../../../../hooks/useDisclosure';
import { AppLogo } from '../../../../components/AppLogo/AppLogo';
import { AppStatus } from '../../../../components/AppStatus';
import { AppActions } from '../../components/AppActions';
import { AppDetailsTabs } from '../../components/AppDetailsTabs';
import { InstallModal } from '../../components/InstallModal';
import { StopModal } from '../../components/StopModal';
import { UninstallModal } from '../../components/UninstallModal';
import { UpdateModal } from '../../components/UpdateModal';
import { UpdateSettingsModal } from '../../components/UpdateSettingsModal';
import { FormValues } from '../../components/InstallForm/InstallForm';
import { trpc } from '../../../../utils/trpc';
import { AppRouterOutput } from '../../../../../server/routers/app/app.router';
import { castAppConfig } from '../../helpers/castAppConfig';

interface IProps {
  app: AppRouterOutput['getApp'];
}

export const AppDetailsContainer: React.FC<IProps> = ({ app }) => {
  const t = useTranslations();
  const installDisclosure = useDisclosure();
  const uninstallDisclosure = useDisclosure();
  const stopDisclosure = useDisclosure();
  const updateDisclosure = useDisclosure();
  const updateSettingsDisclosure = useDisclosure();

  const utils = trpc.useContext();

  const invalidate = () => {
    utils.app.installedApps.invalidate();
    utils.app.getApp.invalidate({ id: app.id });
  };

  const install = trpc.app.installApp.useMutation({
    onMutate: () => {
      utils.app.getApp.setData({ id: app.id }, { ...app, status: 'installing' });
      installDisclosure.close();
    },
    onSuccess: () => {
      invalidate();
      toast.success(t('apps.app-details.install-success'));
    },
    onError: (e) => {
      invalidate();
      const toastMessage = t(e.data?.translatedError || (e.message as MessageKey));
      toast.error(toastMessage);
    },
  });

  const uninstall = trpc.app.uninstallApp.useMutation({
    onMutate: () => {
      utils.app.getApp.setData({ id: app.id }, { ...app, status: 'uninstalling' });
      uninstallDisclosure.close();
    },
    onSuccess: () => {
      invalidate();
      toast.success(t('apps.app-details.uninstall-success'));
    },
    onError: (e) => toast.error(t(e.data?.translatedError || (e.message as MessageKey))),
  });

  const stop = trpc.app.stopApp.useMutation({
    onMutate: () => {
      utils.app.getApp.setData({ id: app.id }, { ...app, status: 'stopping' });
      stopDisclosure.close();
    },
    onSuccess: () => {
      invalidate();
      toast.success(t('apps.app-details.stop-success'));
    },
    onError: (e) => toast.error(t(e.data?.translatedError || (e.message as MessageKey))),
  });

  const update = trpc.app.updateApp.useMutation({
    onMutate: () => {
      utils.app.getApp.setData({ id: app.id }, { ...app, status: 'updating' });
      updateDisclosure.close();
    },
    onSuccess: () => {
      invalidate();
      toast.success(t('apps.app-details.update-success'));
    },
    onError: (e) => toast.error(t(e.data?.translatedError || (e.message as MessageKey))),
  });

  const start = trpc.app.startApp.useMutation({
    onMutate: () => {
      utils.app.getApp.setData({ id: app.id }, { ...app, status: 'starting' });
    },
    onSuccess: () => {
      invalidate();
      toast.success(t('apps.app-details.start-success'));
    },
    onError: (e) => toast.error(t(e.data?.translatedError || (e.message as MessageKey))),
  });

  const updateConfig = trpc.app.updateAppConfig.useMutation({
    onMutate: () => updateSettingsDisclosure.close(),
    onSuccess: () => {
      invalidate();
      toast.success(t('apps.app-details.update-config-success'));
    },
    onError: (e) => toast.error(t(e.data?.translatedError || (e.message as MessageKey))),
  });

  const updateAvailable = Number(app.version || 0) < Number(app?.latestVersion || 0);

  const handleInstallSubmit = async (values: FormValues) => {
    const { exposed, domain, ...form } = values;
    install.mutate({ id: app.id, form, exposed, domain });
  };

  const handleUnistallSubmit = () => {
    uninstall.mutate({ id: app.id });
  };

  const handleStopSubmit = () => {
    stop.mutate({ id: app.id });
  };

  const handleStartSubmit = async () => {
    start.mutate({ id: app.id });
  };

  const handleUpdateSettingsSubmit = async (values: FormValues) => {
    const { exposed, domain, ...form } = values;
    updateConfig.mutate({ id: app.id, form, exposed, domain });
  };

  const handleUpdateSubmit = async () => {
    update.mutate({ id: app.id });
  };

  const handleOpen = () => {
    const { https } = app.info;
    const protocol = https ? 'https' : 'http';

    if (typeof window !== 'undefined') {
      // Current domain
      const domain = window.location.hostname;
      window.open(`${protocol}://${domain}:${app.info.port}${app.info.url_suffix || ''}`, '_blank', 'noreferrer');
    }
  };

  const newVersion = [app?.latestDockerVersion ? `${app?.latestDockerVersion}` : '', `(${String(app?.latestVersion)})`].join(' ');

  return (
    <div className="card" data-testid="app-details">
      <InstallModal onSubmit={handleInstallSubmit} isOpen={installDisclosure.isOpen} onClose={installDisclosure.close} info={app.info} />
      <StopModal onConfirm={handleStopSubmit} isOpen={stopDisclosure.isOpen} onClose={stopDisclosure.close} info={app.info} />
      <UninstallModal onConfirm={handleUnistallSubmit} isOpen={uninstallDisclosure.isOpen} onClose={uninstallDisclosure.close} info={app.info} />
      <UpdateModal onConfirm={handleUpdateSubmit} isOpen={updateDisclosure.isOpen} onClose={updateDisclosure.close} info={app.info} newVersion={newVersion} />
      <UpdateSettingsModal
        onSubmit={handleUpdateSettingsSubmit}
        isOpen={updateSettingsDisclosure.isOpen}
        onClose={updateSettingsDisclosure.close}
        info={app.info}
        config={castAppConfig(app?.config)}
        exposed={app?.exposed}
        domain={app?.domain || ''}
      />
      <div className="card-header d-flex flex-column flex-md-row">
        <AppLogo id={app.id} size={130} alt={app.info.name} />
        <div className="w-100 d-flex flex-column ms-md-3 align-items-center align-items-md-start">
          <div>
            <span className="mt-1 me-1">{t('apps.app-details.version')}: </span>
            <span className="badge bg-gray mt-2">{app.info.version}</span>
          </div>
          {app.domain && (
            <a target="_blank" rel="noreferrer" className="mt-1" href={`https://${app.domain}`}>
              https://{app.domain}
            </a>
          )}
          <span className="mt-1 text-muted text-center mb-2">{app.info.short_desc}</span>
          <div className="mb-1">{app.status !== 'missing' && <AppStatus status={app.status} />}</div>
          <AppActions
            updateAvailable={updateAvailable}
            onUpdate={updateDisclosure.open}
            onUpdateSettings={updateSettingsDisclosure.open}
            onStop={stopDisclosure.open}
            onCancel={stopDisclosure.open}
            onUninstall={uninstallDisclosure.open}
            onInstall={installDisclosure.open}
            onOpen={handleOpen}
            onStart={handleStartSubmit}
            info={app.info}
            status={app.status}
          />
        </div>
      </div>
      <AppDetailsTabs info={app.info} />
    </div>
  );
};
