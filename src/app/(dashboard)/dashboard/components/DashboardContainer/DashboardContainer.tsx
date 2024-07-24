'use client';

import { IconCircuitResistor, IconCpu, IconDatabase } from '@tabler/icons-react';
import React from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { systemLoadSchema, type SystemLoad } from '@runtipi/shared';
import { SystemStat } from '../SystemStat';

type IProps = {
  initialData: SystemLoad;
};

async function fetchSystemStatus() {
  const response = await fetch('/api/system-status');
  if (!response.ok) {
    throw new Error('Problem fetching data');
  }
  const systemLoad = await response.json();

  return systemLoadSchema.parse(systemLoad);
}

export const DashboardContainer: React.FC<IProps> = ({ initialData }) => {
  const { data } = useQuery({ queryKey: ['systemLoad'], queryFn: fetchSystemStatus, initialData, refetchInterval: 3000 });

  const t = useTranslations();

  if (!data) {
    return null;
  }

  return (
    <div className="row row-deck row-cards">
      <SystemStat
        title={t('DASHBOARD_DISK_SPACE_TITLE')}
        metric={`${data.diskUsed} GB`}
        subtitle={t('DASHBOARD_DISK_SPACE_SUBTITLE', { total: data.diskSize })}
        icon={IconDatabase}
        progress={data.percentUsed || 0}
      />
      <SystemStat
        title={t('DASHBOARD_CPU_TITLE')}
        metric={`${data.cpuLoad?.toFixed(2)}%`}
        subtitle={t('DASHBOARD_CPU_SUBTITLE')}
        icon={IconCpu}
        progress={data.cpuLoad || 0}
      />
      <SystemStat
        title={t('DASHBOARD_MEMORY_TITLE')}
        metric={`${data.percentUsedMemory || 0}%`}
        subtitle={`${data.memoryTotal} GB`}
        icon={IconCircuitResistor}
        progress={data.percentUsedMemory || 0}
      />
    </div>
  );
};
