import React, { ReactElement, useEffect, useState } from 'react';
import useSWR from 'swr';
import { SystemStatus } from '../../../state/systemStore';
import { StatusScreen } from '../../StatusScreen';

interface IProps {
  children: ReactElement;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const StatusProvider: React.FC<IProps> = ({ children }) => {
  const [s, setS] = useState<SystemStatus>(SystemStatus.RUNNING);
  const { data } = useSWR<{ status: SystemStatus }>('/api/status', fetcher, { refreshInterval: 1000 });

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
    return <StatusScreen title="Your system is restarting..." subtitle="Please do not refresh this page" />;
  }

  if (s === SystemStatus.UPDATING) {
    return <StatusScreen title="Your system is updating..." subtitle="Please do not refresh this page" />;
  }

  return children;
};
