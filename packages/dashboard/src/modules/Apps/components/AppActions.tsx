import { Button } from '@chakra-ui/react';
import React from 'react';
import { FiExternalLink, FiPause, FiPlay, FiSettings, FiTrash2 } from 'react-icons/fi';
import { AppInfo, AppStatusEnum } from '../../../generated/graphql';

interface IProps {
  app: AppInfo;
  status?: AppStatusEnum;
  onInstall: () => void;
  onUninstall: () => void;
  onStart: () => void;
  onStop: () => void;
  onOpen: () => void;
  onUpdate: () => void;
}

const AppActions: React.FC<IProps> = ({ app, status, onInstall, onUninstall, onStart, onStop, onOpen, onUpdate }) => {
  const hasSettings = Object.keys(app.form_fields).length > 0;

  if (status === AppStatusEnum.Stopped) {
    return (
      <div className="flex flex-wrap justify-center">
        <Button onClick={onStart} width={150} colorScheme="green" className="mt-3 mr-2">
          Start
          <FiPlay className="ml-1" />
        </Button>
        <Button onClick={onUninstall} width={150} colorScheme="gray" className="mt-3 mr-2">
          Remove
          <FiTrash2 className="ml-1" />
        </Button>
        {hasSettings && (
          <Button onClick={onUpdate} width={150} colorScheme="gray" className="mt-3 mr-2">
            Settings
            <FiSettings className="ml-1" />
          </Button>
        )}
      </div>
    );
  } else if (status === AppStatusEnum.Running) {
    return (
      <div>
        <Button onClick={onOpen} width={150} colorScheme="gray" className="mt-3 mr-2">
          Open
          <FiExternalLink className="ml-1" />
        </Button>
        <Button onClick={onStop} width={150} colorScheme="red" className="mt-3">
          Stop
          <FiPause className="ml-2" />
        </Button>
      </div>
    );
  } else if (status === AppStatusEnum.Installing || status === AppStatusEnum.Uninstalling || status === AppStatusEnum.Starting || status === AppStatusEnum.Stopping) {
    return (
      <div className="flex items-center sm:items-start flex-col md:flex-row">
        <Button isLoading onClick={() => null} width={160} colorScheme="green" className="mt-3">
          Install
          <FiPlay className="ml-1" />
        </Button>
        <span className="text-gray-500 text-sm ml-2 mt-3 self-center text-center sm:text-left">{`App is ${status} please wait and don't refresh page...`}</span>
      </div>
    );
  }

  return (
    <Button onClick={onInstall} width={160} colorScheme="green" className="mt-3">
      Install
    </Button>
  );
};

export default AppActions;
