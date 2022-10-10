import { SlideFade } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { SystemStatus, useSystemStore } from '../../state/systemStore';
import RestartingScreen from './RestartingScreen';
import UpdatingScreen from './UpdatingScreen';

interface IProps {
  children: React.ReactNode;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const StatusWrapper: React.FC<IProps> = ({ children }) => {
  const [s, setS] = useState<SystemStatus>(SystemStatus.RUNNING);
  const { baseUrl } = useSystemStore();
  const { data } = useSWR(`${baseUrl}/status`, fetcher, { refreshInterval: 1000 });

  useEffect(() => {
    if (data?.status === SystemStatus.RUNNING) {
      setS(SystemStatus.RUNNING);
    }
    if (data?.status === SystemStatus.RESTARTING) {
      setS(SystemStatus.RESTARTING);
    }
    if (data?.status === SystemStatus.UPDATING) {
      setS(SystemStatus.UPDATING);
    }
  }, [data?.status]);

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
