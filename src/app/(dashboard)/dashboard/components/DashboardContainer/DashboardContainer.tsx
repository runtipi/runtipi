'use client';

import { IconCircuitResistor, IconCpu, IconDatabase } from '@tabler/icons-react';
import React from 'react';
import { useTranslations } from 'next-intl';
import { SystemStat } from '../SystemStat';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';

const queryClient = new QueryClient();

export const DashboardContainer = () => {
  console.log();
  return (
    <QueryClientProvider client={queryClient}>
      <SystemStatus />
    </QueryClientProvider>
  );
};

export const SystemStatus = () => {
  let data: any = { diskUsed: 0, diskSize: 0, percentUsed: 0, cpuLoad: 0, memoryTotal: 0, percentUsedMemory: 0 };

  const fetchedData = useQuery('systemStatus', () => fetch('/api/system-status').then((res: any) => res.json()));

  if (fetchedData.isSuccess) {
    data = fetchedData.data;
  }

  const t = useTranslations();

  return (
    <div className="row row-deck row-cards">
      <SystemStat
        title={t('DASHBOARD_DISK_SPACE_TITLE')}
        metric={`${data.diskUsed} GB`}
        subtitle={t('DASHBOARD_DISK_SPACE_SUBTITLE', { total: data.diskSize })}
        icon={IconDatabase}
        progress={data.percentUsed}
      />
      <SystemStat
        title={t('DASHBOARD_CPU_TITLE')}
        metric={`${data.cpuLoad.toFixed(2)}%`}
        subtitle={t('DASHBOARD_CPU_SUBTITLE')}
        icon={IconCpu}
        progress={data.cpuLoad}
      />
      <SystemStat
        title={t('DASHBOARD_MEMORY_TITLE')}
        metric={`${data.percentUsedMemory || 0}%`}
        subtitle={`${data.memoryTotal} GB`}
        icon={IconCircuitResistor}
        progress={data.percentUsedMemory}
      />
    </div>
  );
};
