'use client';

import React from 'react';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { useAction } from 'next-safe-action/hook';
import { installAppAction } from '@/actions/app-actions/install-app-action';
import { uninstallAppAction } from '@/actions/app-actions/uninstall-app-action';
import { stopAppAction } from '@/actions/app-actions/stop-app-action';
import { startAppAction } from '@/actions/app-actions/start-app-action';
import { updateAppAction } from '@/actions/app-actions/update-app-action';
import { updateAppConfigAction } from '@/actions/app-actions/update-app-config-action';
import { AppLogo } from '@/components/AppLogo';
import { AppStatus } from '@/components/AppStatus';
import { AppStatus as AppStatusEnum } from '@/server/db/schema';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { AppService } from '@/server/services/apps/apps.service';
import { InstallModal } from '../InstallModal';
import { StopModal } from '../StopModal';
import { UninstallModal } from '../UninstallModal';
import { UpdateModal } from '../UpdateModal';
import { UpdateSettingsModal } from '../UpdateSettingsModal/UpdateSettingsModal';
import { AppActions } from '../AppActions';
import { AppDetailsTabs } from '../AppDetailsTabs';

interface IProps {
  app: Awaited<ReturnType<AppService['getApp']>>;
  localDomain?: string;
}
type OpenType = 'local' | 'domain' | 'local_domain';

export const AppDetailsContainer: React.FC<IProps> = ({ app, localDomain }) => {
  const [customStatus, setCustomStatus] = React.useState<AppStatusEnum>(app.status);

  const t = useTranslations();
  const installDisclosure = useDisclosure();
  const uninstallDisclosure = useDisclosure();
  const stopDisclosure = useDisclosure();
  const updateDisclosure = useDisclosure();
  const updateSettingsDisclosure = useDisclosure();

  const installMutation = useAction(installAppAction, {
    onExecute: () => {
      setCustomStatus('installing');
      installDisclosure.close();
    },
    onSuccess: (data) => {
      if (!data.success) {
        setCustomStatus(app.status);
        toast.error(data.failure.reason);
      } else {
        setCustomStatus('running');
        toast.success(t('apps.app-details.install-success'));
      }
    },
  });

  const uninstallMutation = useAction(uninstallAppAction, {
    onExecute: () => {
      setCustomStatus('uninstalling');
      uninstallDisclosure.close();
    },
    onSuccess: (data) => {
      if (!data.success) {
        setCustomStatus(app.status);
        toast.error(data.failure.reason);
      } else {
        setCustomStatus('missing');
        toast.success(t('apps.app-details.uninstall-success'));
      }
    },
  });

  const stopMutation = useAction(stopAppAction, {
    onExecute: () => {
      setCustomStatus('stopping');
      stopDisclosure.close();
    },
    onSuccess: (data) => {
      if (!data.success) {
        setCustomStatus(app.status);
        toast.error(data.failure.reason);
      } else {
        setCustomStatus('stopped');
        toast.success(t('apps.app-details.stop-success'));
      }
    },
  });

  const startMutation = useAction(startAppAction, {
    onExecute: () => {
      setCustomStatus('starting');
    },
    onSuccess: (data) => {
      if (!data.success) {
        setCustomStatus(app.status);
        toast.error(data.failure.reason);
      } else {
        setCustomStatus('running');
        toast.success(t('apps.app-details.start-success'));
      }
    },
  });

  const updateMutation = useAction(updateAppAction, {
    onExecute: () => {
      setCustomStatus('updating');
      updateDisclosure.close();
    },
    onSuccess: (data) => {
      if (!data.success) {
        setCustomStatus(app.status);
        toast.error(data.failure.reason);
      } else {
        setCustomStatus('stopped');
        toast.success(t('apps.app-details.update-success'));
      }
    },
  });

  const updateConfigMutation = useAction(updateAppConfigAction, {
    onExecute: () => {
      updateSettingsDisclosure.close();
    },
    onSuccess: (data) => {
      if (!data.success) {
        toast.error(data.failure.reason);
      } else {
        toast.success(t('apps.app-details.update-config-success'));
      }
    },
  });

  const updateAvailable = Number(app.version || 0) < Number(app?.latestVersion || 0);

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
      <InstallModal onSubmit={(form) => installMutation.execute({ id: app.id, form })} isOpen={installDisclosure.isOpen} onClose={installDisclosure.close} info={app.info} />
      <StopModal onConfirm={() => stopMutation.execute({ id: app.id })} isOpen={stopDisclosure.isOpen} onClose={stopDisclosure.close} info={app.info} />
      <UninstallModal onConfirm={() => uninstallMutation.execute({ id: app.id })} isOpen={uninstallDisclosure.isOpen} onClose={uninstallDisclosure.close} info={app.info} />
      <UpdateModal onConfirm={() => updateMutation.execute({ id: app.id })} isOpen={updateDisclosure.isOpen} onClose={updateDisclosure.close} info={app.info} newVersion={newVersion} />
      <UpdateSettingsModal
        onSubmit={(form) => updateConfigMutation.execute({ id: app.id, form })}
        isOpen={updateSettingsDisclosure.isOpen}
        onClose={updateSettingsDisclosure.close}
        info={app.info}
        config={castAppConfig(app?.config)}
      />
      <div className="card-header d-flex flex-column flex-md-row">
        <AppLogo id={app.id} size={130} alt={app.info.name} />
        <div className="w-100 d-flex flex-column ms-md-3 align-items-center align-items-md-start">
          <div>
            <span className="mt-1 me-1">{t('apps.app-details.version')}: </span>
            <span className="badge bg-muted mt-2 text-white">{app.info.version}</span>
          </div>
          <span className="mt-1 text-muted text-center text-md-start mb-2">{app.info.short_desc}</span>
          <div className="mb-1">{customStatus !== 'missing' && <AppStatus status={customStatus} />}</div>
          <AppActions
            localDomain={localDomain}
            updateAvailable={updateAvailable}
            onUpdate={updateDisclosure.open}
            onUpdateSettings={updateSettingsDisclosure.open}
            onStop={stopDisclosure.open}
            onCancel={stopDisclosure.open}
            onUninstall={uninstallDisclosure.open}
            onInstall={installDisclosure.open}
            onOpen={handleOpen}
            onStart={() => startMutation.execute({ id: app.id })}
            app={app}
            status={customStatus}
          />
        </div>
      </div>
      <AppDetailsTabs info={app.info} />
    </div>
  );
};
