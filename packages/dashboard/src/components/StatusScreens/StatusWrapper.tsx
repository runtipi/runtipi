import { SlideFade } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { SystemStatus } from '../../state/systemStore';
import RestartingScreen from './RestartingScreen';
import UpdatingScreen from './UpdatingScreen';

interface IProps {
  children: React.ReactNode;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const StatusWrapper: React.FC<IProps> = ({ children }) => {
  const [s, setS] = useState<SystemStatus>(SystemStatus.RUNNING);
  const { data } = useSWR('/api/status', fetcher, { refreshInterval: 1000 });

  useEffect(() => {
    // If previous was not running and current is running, we need to refresh the page
    if (data?.status === SystemStatus.RUNNING && s !== SystemStatus.RUNNING) {
      window.location.reload();
    }

    if (data?.status === SystemStatus.RUNNING) {
      setS(SystemStatus.RUNNING);
    }
    if (data?.status === SystemStatus.RESTARTING) {
      setS(SystemStatus.RESTARTING);
    }
    if (data?.status === SystemStatus.UPDATING) {
      setS(SystemStatus.UPDATING);
    }
  }, [data?.status, s]);

  if (s === SystemStatus.RESTARTING) {
    return (
      <SlideFade in>
        <RestartingScreen />
      </SlideFade>
    );
  }

  if (s === SystemStatus.UPDATING) {
    return (
      <SlideFade in>
        <UpdatingScreen />
      </SlideFade>
    );
  }

  return <>{children}</>;
};

export default StatusWrapper;
