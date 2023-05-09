import { Icon, IconDownload, IconExternalLink, IconPlayerPause, IconPlayerPlay, IconSettings, IconTrash, IconX } from '@tabler/icons-react';
import clsx from 'clsx';
import React from 'react';
import type { AppStatus } from '@/server/db/schema';

import { useTranslations } from 'next-intl';
import { Button } from '../../../../components/ui/Button';
import { AppInfo } from '../../../../core/types';

interface IProps {
  info: AppInfo;
  status?: AppStatus;
  updateAvailable: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  onStart: () => void;
  onStop: () => void;
  onOpen: () => void;
  onUpdate: () => void;
  onUpdateSettings: () => void;
  onCancel: () => void;
}

interface BtnProps {
  IconComponent?: Icon;
  onClick: () => void;
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

export const AppActions: React.FC<IProps> = ({ info, status, onInstall, onUninstall, onStart, onStop, onOpen, onUpdate, onCancel, updateAvailable, onUpdateSettings }) => {
  const t = useTranslations('apps.app-details');
  const hasSettings = Object.keys(info.form_fields).length > 0 || info.exposable;

  const buttons: JSX.Element[] = [];

  const StartButton = <ActionButton key="start" IconComponent={IconPlayerPlay} onClick={onStart} title={t('actions.start')} color="success" />;
  const RemoveButton = <ActionButton key="remove" IconComponent={IconTrash} onClick={onUninstall} title={t('actions.remove')} color="danger" />;
  const SettingsButton = <ActionButton key="settings" IconComponent={IconSettings} onClick={onUpdateSettings} title={t('actions.settings')} />;
  const StopButton = <ActionButton key="stop" IconComponent={IconPlayerPause} onClick={onStop} title={t('actions.stop')} color="danger" />;
  const OpenButton = <ActionButton key="open" IconComponent={IconExternalLink} onClick={onOpen} title={t('actions.open')} />;
  const LoadingButtion = <ActionButton key="loading" loading onClick={() => null} color="success" title={t('actions.loading')} />;
  const CancelButton = <ActionButton key="cancel" IconComponent={IconX} onClick={onCancel} title={t('actions.cancel')} />;
  const InstallButton = <ActionButton key="install" onClick={onInstall} title={t('actions.install')} color="success" />;
  const UpdateButton = <ActionButton key="update" IconComponent={IconDownload} onClick={onUpdate} width={null} title={t('actions.update')} color="success" />;

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
    case 'updating':
      buttons.push(LoadingButtion, CancelButton);
      break;
    case 'missing':
      buttons.push(InstallButton);
      break;
    default:
      break;
  }

  return <div className="d-flex justify-content-center flex-wrap">{buttons.map((button) => button)}</div>;
};
