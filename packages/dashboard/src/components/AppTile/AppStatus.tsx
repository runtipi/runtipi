import React from 'react';
import { FiPauseCircle, FiPlayCircle } from 'react-icons/fi';
import { RiLoader4Line } from 'react-icons/ri';
import { AppStatusEnum } from '../../generated/graphql';

const AppStatus: React.FC<{ status: AppStatusEnum }> = ({ status }) => {
  if (status === AppStatusEnum.Running) {
    return (
      <>
        <FiPlayCircle className="text-green-500 mr-1" size={20} />
        <span className="text-gray-400 text-sm">Running</span>
      </>
    );
  }

  if (status === AppStatusEnum.Stopped) {
    return (
      <>
        <FiPauseCircle className="text-red-500 mr-1" size={20} />
        <span className="text-gray-400 text-sm">Stopped</span>
      </>
    );
  }

  return (
    <>
      <RiLoader4Line className="text-gray-500 mr-1" size={20} />
      <span className="text-gray-400 text-sm">{`${status[0]}${status.substring(1, status.length).toLowerCase()}...`}</span>
    </>
  );
};

export default AppStatus;
