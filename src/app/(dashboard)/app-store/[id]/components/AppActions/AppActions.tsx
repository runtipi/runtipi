'use client';

import {
  IconDownload,
  IconExternalLink,
  IconLock,
  IconLockOff,
  IconPlayerPause,
  IconPlayerPlay,
  IconSettings,
  IconTrash,
  IconX,
  IconRotateClockwise,
} from '@tabler/icons-react';
import clsx from 'clsx';
import React, { Fragment } from 'react';

import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';
import { GetAppCommand } from '@/server/services/app-catalog/commands';
import { InstallModal } from '../InstallModal';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { useAction } from 'next-safe-action/hooks';
import { startAppAction } from '@/actions/app-actions/start-app-action';
import toast from 'react-hot-toast';
import { StopModal } from '../StopModal';
import { RestartModal } from '../RestartModal';
import { UninstallModal } from '../UninstallModal';
import { UpdateModal } from '../UpdateModal';
import { ResetAppModal } from '../ResetAppModal';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { UpdateSettingsModal } from '../UpdateSettingsModal/UpdateSettingsModal';
import { useAppStatusStore } from '../../../../../components/ClientProviders/AppStatusProvider/app-status-provider';

interface IProps {
  app: Awaited<ReturnType<GetAppCommand['execute']>>;
  localDomain?: string;
}

interface BtnProps {
  IconComponent?: typeof IconDownload;
  onClick?: () => void;
  width?: number | null;
  title?: string;
  color?: string;
  loading?: boolean;
}

const ActionButton: React.FC<BtnProps> = (props) => {
  const { IconComponent, onClick, title, loading, color, width = 140 } = props;

  const testId = loading ? 'action-button-loading' : undefined;

  return (
    <Button loading={loading} data-testid={testId} onClick={onClick} width={width} className={clsx('me-2 px-4 mt-2', [`btn-${color}`])}>
      {title}
      {IconComponent && <IconComponent className="ms-1" size={14} />}
    </Button>
  );
};

type OpenType = 'local' | 'domain' | 'local_domain';

export const AppActions: React.FC<IProps> = ({ app, localDomain }) => {
  const { info } = app;
  const setAppStatus = useAppStatusStore((state) => state.setAppStatus);
  const appStatus = useAppStatusStore((state) => state.statuses[info.id] || 'missing');
  const updateAvailable = Number(app.version || 0) < Number(app?.latestVersion || 0);

  const installDisclosure = useDisclosure();
  const stopDisclosure = useDisclosure();
  const restartDisclosure = useDisclosure();
  const updateDisclosure = useDisclosure();
  const updateSettingsDisclosure = useDisclosure();
  const uninstallDisclosure = useDisclosure();
  const resetAppDisclosure = useDisclosure();

  const startMutation = useAction(startAppAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onExecute: () => {
      setAppStatus(app.id, 'starting');
    },
  });

  const t = useTranslations();
  const hasSettings = Object.keys(info.form_fields).length > 0 || info.exposable;

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const buttons: JSX.Element[] = [];

  const StartButton = (
    <ActionButton
      key="start"
      IconComponent={IconPlayerPlay}
      onClick={() => startMutation.execute({ id: app.id })}
      title={t('APP_ACTION_START')}
      color="success"
    />
  );
  const RemoveButton = (
    <ActionButton key="remove" IconComponent={IconTrash} onClick={uninstallDisclosure.open} title={t('APP_ACTION_REMOVE')} color="danger" />
  );
  const SettingsButton = (
    <ActionButton key="settings" IconComponent={IconSettings} onClick={updateSettingsDisclosure.open} title={t('APP_ACTION_SETTINGS')} />
  );
  const StopButton = (
    <ActionButton key="stop" IconComponent={IconPlayerPause} onClick={stopDisclosure.open} title={t('APP_ACTION_STOP')} color="danger" />
  );
  const restartButton = (
    <ActionButton key="restart" IconComponent={IconRotateClockwise} onClick={restartDisclosure.open} title={t('APP_ACTION_RESTART')} />
  );
  const LoadingButtion = <ActionButton key="loading" loading color="success" title={t('APP_ACTION_LOADING')} />;
  const CancelButton = <ActionButton key="cancel" IconComponent={IconX} onClick={stopDisclosure.open} title={t('APP_ACTION_CANCEL')} />;
  const InstallButton = <ActionButton key="install" onClick={installDisclosure.open} title={t('APP_ACTION_INSTALL')} color="success" />;
  const UpdateButton = (
    <ActionButton
      key="update"
      IconComponent={IconDownload}
      onClick={updateDisclosure.open}
      width={null}
      title={t('APP_ACTION_UPDATE')}
      color="success"
    />
  );

  const OpenButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button width={140} className={clsx('me-2 px-4 mt-2')}>
          {t('APP_ACTION_OPEN')}
          <IconExternalLink className="ms-1" size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{t('APP_DETAILS_CHOOSE_OPEN_METHOD')}</DropdownMenuLabel>
        <DropdownMenuGroup>
          {app.exposed && app.domain && (
            <DropdownMenuItem onClick={() => handleOpen('domain')}>
              <IconLock className="text-green me-2" size={16} />
              {app.domain}
            </DropdownMenuItem>
          )}
          {(app.exposedLocal || !info.dynamic_config) && (
            <DropdownMenuItem onClick={() => handleOpen('local_domain')}>
              <IconLock className="text-muted me-2" size={16} />
              {app.id}.{localDomain}
            </DropdownMenuItem>
          )}
          {(app.openPort || !info.dynamic_config) && (
            <DropdownMenuItem onClick={() => handleOpen('local')}>
              <IconLockOff className="text-muted me-2" size={16} />
              {hostname}:{app.info.port}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  switch (appStatus) {
    case 'stopped':
      buttons.push(StartButton, RemoveButton);
      if (hasSettings) {
        buttons.push(SettingsButton);
      }
      if (updateAvailable) {
        buttons.push(UpdateButton);
      }
      break;
    case 'running':
      buttons.push(StopButton);
      buttons.push(restartButton);
      if (!info.no_gui) {
        buttons.push(OpenButton);
      }
      if (hasSettings) {
        buttons.push(SettingsButton);
      }
      if (updateAvailable) {
        buttons.push(UpdateButton);
      }
      break;
    case 'installing':
    case 'uninstalling':
    case 'starting':
    case 'stopping':
    case 'restarting':
    case 'updating':
    case 'resetting':
      buttons.push(LoadingButtion, CancelButton);
      break;
    case 'missing':
      buttons.push(InstallButton);
      break;
    default:
      break;
  }

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

  const openResetAppModal = () => {
    updateSettingsDisclosure.close();

    setTimeout(() => {
      resetAppDisclosure.open();
    }, 300);
  };

  const newVersion = [app?.latestDockerVersion ? `${app?.latestDockerVersion}` : '', `(${String(app?.latestVersion)})`].join(' ');

  return (
    <div className="d-flex justify-content-center flex-wrap">
      <InstallModal isOpen={installDisclosure.isOpen} onClose={installDisclosure.close} info={app.info} />
      <StopModal isOpen={stopDisclosure.isOpen} onClose={stopDisclosure.close} info={app.info} />
      <RestartModal isOpen={restartDisclosure.isOpen} onClose={restartDisclosure.close} info={app.info} />
      <UninstallModal isOpen={uninstallDisclosure.isOpen} onClose={uninstallDisclosure.close} info={app.info} />
      <UpdateModal isOpen={updateDisclosure.isOpen} onClose={updateDisclosure.close} info={app.info} newVersion={newVersion} />
      <ResetAppModal isOpen={resetAppDisclosure.isOpen} onClose={resetAppDisclosure.close} info={app.info} />
      <UpdateSettingsModal
        isOpen={updateSettingsDisclosure.isOpen}
        onClose={updateSettingsDisclosure.close}
        info={app.info}
        config={castAppConfig(app?.config)}
        onReset={openResetAppModal}
      />
      {buttons.map((button) => (
        <Fragment key={button.key}>{button}</Fragment>
      ))}
    </div>
  );
};
