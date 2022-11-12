import { Button, Tooltip } from '@chakra-ui/react';
import React from 'react';
import { IconType } from 'react-icons';
import { FiExternalLink, FiPause, FiPlay, FiSettings, FiTrash2 } from 'react-icons/fi';
import { MdSystemUpdateAlt } from 'react-icons/md';
import { TiCancel } from 'react-icons/ti';
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
  Icon?: IconType;
  onClick: () => void;
  width?: number | null;
  title?: string;
  color?: string;
  loading?: boolean;
}

const ActionButton: React.FC<BtnProps> = (props) => {
  const { Icon, onClick, title, loading, width = 150, color = 'gray' } = props;

  return (
    <Button isLoading={loading} onClick={onClick} width={width || undefined} colorScheme={color} className="mt-3 mr-2">
      {title}
      {Icon && <Icon className="ml-1" />}
    </Button>
  );
};

const AppActions: React.FC<IProps> = ({ app, status, onInstall, onUninstall, onStart, onStop, onOpen, onUpdate, onCancel, updateAvailable, onUpdateSettings }) => {
  const hasSettings = Object.keys(app.form_fields).length > 0 || app.exposable;

  const buttons: JSX.Element[] = [];

  const renderStatus = () => {
    if (status === AppStatusEnum.Installing || status === AppStatusEnum.Uninstalling || status === AppStatusEnum.Starting || status === AppStatusEnum.Stopping || status === AppStatusEnum.Updating) {
      return <span className="text-gray-500 text-sm ml-2 mt-3 self-center text-center sm:text-left">{`App is ${status.toLowerCase()} please wait...`}</span>;
    }
  };

  const StartButton = <ActionButton Icon={FiPlay} onClick={onStart} title="Start" color="green" />;
  const RemoveButton = <ActionButton Icon={FiTrash2} onClick={onUninstall} title="Remove" />;
  const SettingsButton = <ActionButton Icon={FiSettings} width={null} onClick={onUpdateSettings} />;
  const StopButton = <ActionButton Icon={FiPause} onClick={onStop} title="Stop" color="red" />;
  const OpenButton = <ActionButton Icon={FiExternalLink} onClick={onOpen} title="Open" />;
  const LoadingButtion = <ActionButton loading onClick={() => null} color="green" />;
  const CancelButton = <ActionButton Icon={TiCancel} onClick={onCancel} title="Cancel" />;
  const InstallButton = <ActionButton onClick={onInstall} title="Install" color="green" />;
  const UpdateButton = (
    <Tooltip label="Download update">
      <ActionButton Icon={MdSystemUpdateAlt} onClick={onUpdate} width={null} />
    </Tooltip>
  );

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

  return (
    <div className="flex flex-1 flex-col justify-start">
      <div className="flex flex-1 justify-center md:justify-start flex-wrap">
        {buttons.map((button) => {
          return button;
        })}
      </div>
      <div className="mt-1 flex justify-center md:justify-start">{renderStatus()}</div>
    </div>
  );
};

export default AppActions;
