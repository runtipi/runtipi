import React, { ReactElement, useEffect, useRef } from 'react';
import router from 'next/router';
import { SystemStatus, useSystemStore } from '../../../state/systemStore';
import { StatusScreen } from '../../StatusScreen';

interface IProps {
  children: ReactElement;
}

export const StatusProvider: React.FC<IProps> = ({ children }) => {
  const { status } = useSystemStore();
  const s = useRef(status);

  useEffect(() => {
    // If previous was not running and current is running, we need to refresh the page
    if (status === SystemStatus.RUNNING && s.current !== SystemStatus.RUNNING) {
      router.reload();
    }
    if (status === SystemStatus.RUNNING) {
      s.current = SystemStatus.RUNNING;
    }
    if (status === SystemStatus.RESTARTING) {
      s.current = SystemStatus.RESTARTING;
    }
    if (status === SystemStatus.UPDATING) {
      s.current = SystemStatus.UPDATING;
    }
  }, [status, s]);

  if (s.current === SystemStatus.LOADING) {
    return <StatusScreen title="" subtitle="" />;
  }

  if (s.current === SystemStatus.RESTARTING) {
    return <StatusScreen title="Your system is restarting..." subtitle="Please do not refresh this page" />;
  }

  if (s.current === SystemStatus.UPDATING) {
    return <StatusScreen title="Your system is updating..." subtitle="Please do not refresh this page" />;
  }

  return children;
};
