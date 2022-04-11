import { Button } from '@chakra-ui/react';
import React from 'react';
import { FiPause, FiPlay, FiTrash2 } from 'react-icons/fi';
import { AppConfig } from '../../../core/types';

interface IProps {
  app: AppConfig;
  onInstall: () => void;
  onUninstall: () => void;
  onStart: () => void;
  onStop: () => void;
}

const AppActions: React.FC<IProps> = ({ app, onInstall, onUninstall, onStart, onStop }) => {
  if (app?.installed && app.status === 'stopped') {
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
  } else if (app?.installed && app.status === 'running') {
    return (
      <Button onClick={onStop} width={160} colorScheme="red" className="mt-3">
        Stop
        <FiPause className="ml-2" />
      </Button>
    );
  }

  return (
    <Button onClick={onInstall} width={160} colorScheme="green" className="mt-3">
      Install
    </Button>
  );
};

export default AppActions;
