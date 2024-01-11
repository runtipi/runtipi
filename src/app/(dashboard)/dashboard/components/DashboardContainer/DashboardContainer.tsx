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

  const t = useTranslations('dashboard');

  if (!lastData) {
    return null;
  }

  return (
    <div className="row row-deck row-cards">
      <SystemStat
        title={t('cards.disk.title')}
        metric={`${lastData.diskUsed} GB`}
        subtitle={t('cards.disk.subtitle', { total: lastData.diskSize })}
        icon={IconDatabase}
        progress={lastData.percentUsed}
      />
      <SystemStat
        title={t('cards.cpu.title')}
        metric={`${lastData.cpuLoad.toFixed(2)}%`}
        subtitle={t('cards.cpu.subtitle')}
        icon={IconCpu}
        progress={lastData.cpuLoad}
      />
      <SystemStat
        title={t('cards.memory.title')}
        metric={`${lastData.percentUsedMemory || 0}%`}
        subtitle={`${lastData.memoryTotal} GB`}
        icon={IconCircuitResistor}
        progress={lastData.percentUsedMemory}
      />
    </div>
  );
};
