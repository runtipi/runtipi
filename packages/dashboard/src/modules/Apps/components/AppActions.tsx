import { IconDownload, IconExternalLink, IconPlayerPause, IconPlayerPlay, IconSettings, IconTrash, IconX, TablerIcon } from '@tabler/icons';
import clsx from 'clsx';
import React from 'react';

import { Button } from '../../../components/ui/Button';
import { AppInfo, AppStatusEnum } from '../../../generated/graphql';

interface IProps {
  app: AppInfo;
  status?: AppStatusEnum;
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
  Icon?: TablerIcon;
  onClick: () => void;
  width?: number | null;
  title?: string;
  color?: string;
  loading?: boolean;
}

const ActionButton: React.FC<BtnProps> = (props) => {
  const { Icon, onClick, title, loading, color, width = 140 } = props;

  return (
    <Button loading={loading} onClick={onClick} width={width} className={clsx('me-2 px-4 mt-2', [`btn-${color}`])}>
      {title}
      {Icon && <Icon className="ms-1" size={14} />}
    </Button>
  );
};

const AppActions: React.FC<IProps> = ({ app, status, onInstall, onUninstall, onStart, onStop, onOpen, onUpdate, onCancel, updateAvailable, onUpdateSettings }) => {
  const hasSettings = Object.keys(app.form_fields).length > 0 || app.exposable;

  const buttons: JSX.Element[] = [];

  const StartButton = <ActionButton Icon={IconPlayerPlay} onClick={onStart} title="Start" color="success" />;
  const RemoveButton = <ActionButton Icon={IconTrash} onClick={onUninstall} title="Remove" color="danger" />;
  const SettingsButton = <ActionButton Icon={IconSettings} onClick={onUpdateSettings} title="Settings" />;
  const StopButton = <ActionButton Icon={IconPlayerPause} onClick={onStop} title="Stop" color="danger" />;
  const OpenButton = <ActionButton Icon={IconExternalLink} onClick={onOpen} title="Open" />;
  const LoadingButtion = <ActionButton loading onClick={() => null} color="success" />;
  const CancelButton = <ActionButton Icon={IconX} onClick={onCancel} title="Cancel" />;
  const InstallButton = <ActionButton onClick={onInstall} title="Install" color="success" />;
  const UpdateButton = <ActionButton Icon={IconDownload} onClick={onUpdate} width={null} title="Update" color="success" />;

  switch (status) {
    case AppStatusEnum.Stopped:
      buttons.push(StartButton, RemoveButton);
      if (hasSettings) {
        buttons.push(SettingsButton);
      }
      if (updateAvailable) {
        buttons.push(UpdateButton);
      }
      break;
    case AppStatusEnum.Running:
      buttons.push(StopButton);
      if (!app.no_gui) {
        buttons.push(OpenButton);
      }
      if (hasSettings) {
        buttons.push(SettingsButton);
      }
      if (updateAvailable) {
        buttons.push(UpdateButton);
      }
      break;
    case AppStatusEnum.Installing:
    case AppStatusEnum.Uninstalling:
    case AppStatusEnum.Starting:
    case AppStatusEnum.Stopping:
      buttons.push(LoadingButtion, CancelButton);
      break;

    case AppStatusEnum.Updating:
      buttons.push(LoadingButtion, CancelButton);
      break;
    case AppStatusEnum.Missing:
      buttons.push(InstallButton);
      break;
    default:
      break;
  }

  return <div className="d-flex justify-content-center flex-wrap">{buttons.map((button) => button)}</div>;
};

export default AppActions;
