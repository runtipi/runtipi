'use client';

import { StatusScreen } from '@/components/StatusScreen';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { statusSchema } from 'packages/shared/src';

interface IProps {
  children: React.ReactNode;
}

async function fetchStatus() {
  const response = await fetch('/api/status');
  if (!response.ok) {
    throw new Error('Problem fetching data');
  }
  const status = await response.json();

  return statusSchema.parse(status);
}

export const StatusProvider: React.FC<IProps> = ({ children }) => {
  const { data, isLoading, error } = useQuery({ queryKey: ['status'], queryFn: fetchStatus, refetchInterval: 2000 });
  const t = useTranslations();

  if (!data) {
    return <StatusScreen title={t('STATUS_LOADING_TITLE')} subtitle={t('STATUS_LOADING_SUBTITLE')} />;
  }

  if (error) {
    return <StatusScreen title={t('STATUS_ERROR_TITLE')} subtitle={t('STATUS_ERROR_SUBTITLE')} loading={false} />;
  }

  if (isLoading) {
    return <StatusScreen title={t('STATUS_LOADING_TITLE')} subtitle={t('STATUS_LOADING_SUBTITLE')} />;
  }

  if (data.status === 'RESTARTING') {
    return <StatusScreen title={t('STATUS_RESTARTING_TITLE')} subtitle={t('STATUS_RESTARTING_SUBTITLE')} />;
  }

  return children;
};
