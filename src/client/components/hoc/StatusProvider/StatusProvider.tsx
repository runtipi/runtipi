import React, { ReactElement, useEffect, useRef } from 'react';
import router from 'next/router';
import { useSystemStore } from '../../../state/systemStore';
import { StatusScreen } from '../../StatusScreen';

interface IProps {
  children: ReactElement;
}

export const StatusProvider: React.FC<IProps> = ({ children }) => {
  const { status, setPollStatus } = useSystemStore();
  const s = useRef(status);

  useEffect(() => {
    // If previous was not running and current is running, we need to refresh the page
    if (status === 'RUNNING' && s.current !== 'RUNNING') {
      setPollStatus(false);
      router.reload();
    }
    if (status === 'RUNNING') {
      s.current = 'RUNNING';
    }
    if (status === 'RESTARTING') {
      s.current = 'RESTARTING';
    }
    if (status === 'UPDATING') {
      s.current = 'UPDATING';
    }
  }, [status, s, setPollStatus]);

  if (s.current === 'LOADING') {
    return <StatusScreen title="" subtitle="" />;
  }

  if (s.current === 'RESTARTING') {
    return <StatusScreen title="Your system is restarting..." subtitle="Please do not refresh this page" />;
  }

  if (s.current === 'UPDATING') {
    return <StatusScreen title="Your system is updating..." subtitle="Please do not refresh this page" />;
  }

  return children;
};
