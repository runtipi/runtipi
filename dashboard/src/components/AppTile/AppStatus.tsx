import React from 'react';
import { FiPauseCircle, FiPlayCircle } from 'react-icons/fi';
import { AppStatus as TAppStatus } from '../../core/types';

const AppStatus: React.FC<{ status: TAppStatus }> = ({ status }) => {
  if (status === 'running') {
    return (
      <>
        <FiPlayCircle className="text-green-500 mr-1" size={20} />
        <span className="text-gray-400 text-sm">Running</span>
      </>
    );
  }

  return (
    <>
      <FiPauseCircle className="text-red-500 mr-1" size={20} />
      <span className="text-gray-400 text-sm">Stopped</span>
    </>
  );
};

export default AppStatus;
