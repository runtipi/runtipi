import { Button, Tooltip } from '@chakra-ui/react';
import React from 'react';
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

const AppActions: React.FC<IProps> = ({ app, status, onInstall, onUninstall, onStart, onStop, onOpen, onUpdate, onCancel, updateAvailable, onUpdateSettings }) => {
  const hasSettings = Object.keys(app.form_fields).length > 0;

  const buttons: JSX.Element[] = [];

  const renderStatus = () => {
    if (status === AppStatusEnum.Installing || status === AppStatusEnum.Uninstalling || status === AppStatusEnum.Starting || status === AppStatusEnum.Stopping || status === AppStatusEnum.Updating) {
      return <span className="text-gray-500 text-sm ml-2 mt-3 self-center text-center sm:text-left">{`App is ${status.toLowerCase()} please wait...`}</span>;
    }
  };

  switch (status) {
    case AppStatusEnum.Stopped:
      buttons.push(
        <Button onClick={onStart} width={150} colorScheme="green" className="mt-3 mr-2">
          Start
          <FiPlay className="ml-1" />
        </Button>,
        <Button onClick={onUninstall} width={150} colorScheme="gray" className="mt-3 mr-2">
          Remove
          <FiTrash2 className="ml-1" />
        </Button>,
      );
      if (hasSettings) {
        buttons.push(
          <Tooltip label="Update settings">
            <Button onClick={onUpdateSettings} colorScheme="gray" className="mt-3 mr-2">
              <FiSettings className="ml-1" />
            </Button>
          </Tooltip>,
        );
      }
      if (updateAvailable) {
        buttons.push(
          <Tooltip label="Download update">
            <Button onClick={onUpdate} colorScheme="gray" className="mt-3 mr-2">
              <MdSystemUpdateAlt className="ml-1" />
            </Button>
          </Tooltip>,
        );
      }
      break;
    case AppStatusEnum.Running:
      buttons.push(
        <Button onClick={onStop} width={150} colorScheme="red" className="mt-3 mr-2">
          Stop
          <FiPause className="ml-1" />
        </Button>,
        <Button onClick={onOpen} width={150} colorScheme="gray" className="mt-3 mr-2">
          Open
          <FiExternalLink className="ml-1" />
        </Button>,
      );
      if (hasSettings) {
        buttons.push(
          <Tooltip label="Update settings">
            <Button onClick={onUpdateSettings} colorScheme="gray" className="mt-3 mr-2">
              <FiSettings className="ml-1" />
            </Button>
          </Tooltip>,
        );
      }
      if (updateAvailable) {
        buttons.push(
          <Tooltip label="Download update">
            <Button onClick={onUpdate} colorScheme="gray" className="mt-3 mr-2">
              <MdSystemUpdateAlt className="ml-1" />
            </Button>
          </Tooltip>,
        );
      }
      break;
    case AppStatusEnum.Installing:
    case AppStatusEnum.Uninstalling:
    case AppStatusEnum.Starting:
    case AppStatusEnum.Stopping:
      buttons.push(
        <Button isLoading onClick={() => null} width={160} colorScheme="green" className="mt-3">
          Install
          <FiPlay className="ml-1" />
        </Button>,
        <Button onClick={onCancel} colorScheme="gray" className="mt-3 mr-2 ml-2">
          <TiCancel />
        </Button>,
      );
      break;

    case AppStatusEnum.Updating:
      buttons.push(
        <Button isLoading onClick={() => null} width={160} colorScheme="green" className="mt-3">
          Updating
          <FiPlay className="ml-1" />
        </Button>,
        <Button onClick={onCancel} colorScheme="gray" className="mt-3 mr-2 ml-2">
          <TiCancel />
        </Button>,
      );
      break;
    case AppStatusEnum.Missing:
      buttons.push(
        <Button onClick={onInstall} width={160} colorScheme="green" className="mt-3">
          Install
        </Button>,
      );
      break;
    default:
      break;
  }

  return (
    <div className="flex items-center sm:items-start flex-col md:flex-row">
      {buttons.map((button) => {
        return button;
      })}
      {renderStatus()}
    </div>
  );
};

export default AppActions;
