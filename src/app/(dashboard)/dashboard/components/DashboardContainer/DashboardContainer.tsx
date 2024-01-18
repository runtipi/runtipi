'use client';

import { IconCircuitResistor, IconCpu, IconDatabase } from '@tabler/icons-react';
import React from 'react';
import { useTranslations } from 'next-intl';
import { SystemStat } from '../SystemStat';
import { useSocket } from '../../../../../lib/socket/useSocket';

type IProps = {
  diskUsed: number;
  diskSize: number;
  percentUsed: number;
  cpuLoad: number;
  memoryTotal: number;
  percentUsedMemory: number;
};

export const DashboardContainer: React.FC<IProps> = (props) => {
  const { lastData } = useSocket({
    initialData: props,
    selector: { type: 'system_info' },
  });

  const t = useTranslations();

  if (!lastData) {
    return null;
  }

  return (
    <div className="row row-deck row-cards">
      <SystemStat
        title={t('DASHBOARD_DISK_SPACE_TITLE')}
        metric={`${lastData.diskUsed} GB`}
        subtitle={t('DASHBOARD_DISK_SPACE_SUBTITLE', { total: lastData.diskSize })}
        icon={IconDatabase}
        progress={lastData.percentUsed}
      />
      <SystemStat
        title={t('DASHBOARD_CPU_TITLE')}
        metric={`${lastData.cpuLoad.toFixed(2)}%`}
        subtitle={t('DASHBOARD_CPU_SUBTITLE')}
        icon={IconCpu}
        progress={lastData.cpuLoad}
      />
      <SystemStat
        title={t('DASHBOARD_MEMORY_TITLE')}
        metric={`${lastData.percentUsedMemory || 0}%`}
        subtitle={`${lastData.memoryTotal} GB`}
        icon={IconCircuitResistor}
        progress={lastData.percentUsedMemory}
      />
    </div>
  );
};
