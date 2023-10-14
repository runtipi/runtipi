'use client';

import React, { useRef, useEffect } from 'react';
import { SystemStatus, useSystemStore } from '@/client/state/systemStore';
import { useRouter } from 'next/navigation';
import useSWR, { Fetcher } from 'swr';
import { StatusScreen } from '../../StatusScreen';

interface IProps {
  children: React.ReactNode;
}

const fetcher: Fetcher<{ status?: SystemStatus }> = () => fetch('/api/get-status').then((res) => res.json() as Promise<{ status: SystemStatus }>);

export const StatusProvider: React.FC<IProps> = ({ children }) => {
  const { status, setStatus, pollStatus, setPollStatus } = useSystemStore();
  const s = useRef(status);

  const router = useRouter();

  useSWR('/api/get-status', fetcher, {
    refreshInterval: pollStatus ? 2000 : 0,
    isPaused: () => !pollStatus,
    onSuccess: (res) => {
      if (res.status) {
        setStatus(res.status);
      }
    },
  });

  useEffect(() => {
    // If previous was not running and current is running, we need to refresh the page
    if (status === 'RUNNING' && s.current !== 'RUNNING') {
      setPollStatus(false);
      router.refresh();
    }
    if (status === 'RUNNING') {
      s.current = 'RUNNING';
    }
    if (status === 'RESTARTING') {
      s.current = 'RESTARTING';
    }
  }, [status, s, router, setPollStatus]);

  if (status === 'RESTARTING') {
    return <StatusScreen title="Your system is restarting..." subtitle="Please do not refresh this page" />;
  }

  return children;
};
