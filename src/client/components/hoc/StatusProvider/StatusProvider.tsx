'use client';

import React, { useRef, useEffect } from 'react';
import { useAction } from 'next-safe-action/hook';
import { useInterval } from 'usehooks-ts';
import { getStatusAction } from '@/actions/settings/get-status';
import { useSystemStore } from '@/client/state/systemStore';
import { useRouter } from 'next/navigation';
import { StatusScreen } from '../../StatusScreen';

interface IProps {
  children: React.ReactNode;
}

export const StatusProvider: React.FC<IProps> = ({ children }) => {
  const { status, setStatus, pollStatus, setPollStatus } = useSystemStore();
  const s = useRef(status);

  const router = useRouter();

  const getStatusMutation = useAction(getStatusAction, {
    onSuccess: (data) => {
      if (data.success) {
        setStatus(data.status);
      }
    },
  });

  // Poll status every 5 seconds
  useInterval(
    () => {
      getStatusMutation.execute({ currentStatus: status });
    },
    pollStatus ? 2000 : null,
  );

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
