import {
  Icon,
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
import type { AppStatus } from '@/server/db/schema';

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
import type { AppService } from '@/server/services/apps/apps.service';

interface IProps {
  app: Awaited<ReturnType<AppService['getApp']>>;
  status?: AppStatus;
  updateAvailable: boolean;
  localDomain?: string;
  onInstall: () => void;
  onUninstall: () => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onOpen: (url: OpenType) => void;
  onUpdate: () => void;
  onUpdateSettings: () => void;
  onCancel: () => void;
}

interface BtnProps {
  IconComponent?: Icon;
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

export const AppActions: React.FC<IProps> = ({
  app,
  status,
  localDomain,
  onInstall,
  onUninstall,
  onStart,
  onStop,
  onRestart,
  onOpen,
  onUpdate,
  onCancel,
  updateAvailable,
  onUpdateSettings,
}) => {
  const { info } = app;
  const t = useTranslations();
  const hasSettings = Object.keys(info.form_fields).length > 0 || info.exposable;

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const buttons: JSX.Element[] = [];

  const StartButton = <ActionButton key="start" IconComponent={IconPlayerPlay} onClick={onStart} title={t('APP_ACTION_START')} color="success" />;
  const RemoveButton = <ActionButton key="remove" IconComponent={IconTrash} onClick={onUninstall} title={t('APP_ACTION_REMOVE')} color="danger" />;
  const SettingsButton = <ActionButton key="settings" IconComponent={IconSettings} onClick={onUpdateSettings} title={t('APP_ACTION_SETTINGS')} />;
  const StopButton = <ActionButton key="stop" IconComponent={IconPlayerPause} onClick={onStop} title={t('APP_ACTION_STOP')} color="danger" />;
  const restartButton = <ActionButton key="restart" IconComponent={IconRotateClockwise} onClick={onRestart} title={t('APP_ACTION_RESTART')} />;
  const LoadingButtion = <ActionButton key="loading" loading color="success" title={t('APP_ACTION_LOADING')} />;
  const CancelButton = <ActionButton key="cancel" IconComponent={IconX} onClick={onCancel} title={t('APP_ACTION_CANCEL')} />;
  const InstallButton = <ActionButton key="install" onClick={onInstall} title={t('APP_ACTION_INSTALL')} color="success" />;
  const UpdateButton = (
    <ActionButton key="update" IconComponent={IconDownload} onClick={onUpdate} width={null} title={t('APP_ACTION_UPDATE')} color="success" />
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
            <DropdownMenuItem onClick={() => onOpen('domain')}>
              <IconLock className="text-green me-2" size={16} />
              {app.domain}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onOpen('local_domain')}>
            <IconLock className="text-muted me-2" size={16} />
            {app.id}.{localDomain}
          </DropdownMenuItem>
          {!app.info.force_expose && (
            <DropdownMenuItem onClick={() => onOpen('local')}>
              <IconLockOff className="text-muted me-2" size={16} />
              {hostname}:{app.info.port}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  switch (status) {
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

  return (
    <div className="d-flex justify-content-center flex-wrap">
      {buttons.map((button) => (
        <Fragment key={button.key}>{button}</Fragment>
      ))}
    </div>
  );
};
