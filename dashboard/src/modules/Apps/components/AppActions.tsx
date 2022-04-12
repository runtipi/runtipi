import { Button } from '@chakra-ui/react';
import React from 'react';
import { FiExternalLink, FiPause, FiPlay, FiTrash2 } from 'react-icons/fi';
import { AppConfig, AppStatus } from '../../../core/types';

interface IProps {
  app: AppConfig;
  onInstall: () => void;
  onUninstall: () => void;
  onStart: () => void;
  onStop: () => void;
}

const AppActions: React.FC<IProps> = ({ app, onInstall, onUninstall, onStart, onStop }) => {
  if (app?.installed && app.status === AppStatus.STOPPED) {
    return (
      <div>
        <Button onClick={onStart} width={160} colorScheme="green" className="mt-3">
          Start
          <FiPlay className="ml-1" />
        </Button>
        <Button onClick={onUninstall} width={160} colorScheme="gray" className="mt-3 ml-2">
          Remove
          <FiTrash2 className="ml-1" />
        </Button>
      </div>
    );
  } else if (app?.installed && app.status === AppStatus.RUNNING) {
    return (
      <div>
        <Button onClick={() => alert('open')} width={160} colorScheme="gray" className="mt-3">
          Open
          <FiExternalLink className="ml-1" />
        </Button>
        <Button onClick={onStop} width={160} colorScheme="red" className="mt-3 ml-2">
          Stop
          <FiPause className="ml-2" />
        </Button>
      </div>
    );
  } else if (app.status === AppStatus.INSTALLING || app.status === AppStatus.UNINSTALLING || app.status === AppStatus.STARTING || app.status === AppStatus.STOPPING) {
    return (
      <div className="flex items-center">
        <Button isLoading onClick={() => null} width={160} colorScheme="green" className="mt-3">
          Install
          <FiPlay className="ml-1" />
        </Button>
        <span className="text-gray-500 text-sm ml-2 mt-3">{`App is ${app.status} please wait and don't refresh page...`}</span>
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
