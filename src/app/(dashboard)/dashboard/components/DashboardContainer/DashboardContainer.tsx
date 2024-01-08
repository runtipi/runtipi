'use client';

import { IconCircuitResistor, IconCpu, IconDatabase } from '@tabler/icons-react';
import React from 'react';
import { useSocket } from '@/lib/socket/useSocket';
import { useTranslations } from 'next-intl';
import { SystemStat } from '../SystemStat';

export const DashboardContainer = () => {
  const [info, setInfo] = React.useState({
    cpu: { load: 0 },
    disk: { total: 0, used: 0, available: 0 },
    memory: { total: 0, used: 0, available: 0 },
  });

  useSocket({
    onEvent: (event, data) => {
      switch (event) {
        case 'status_change':
          setInfo(data.info);
          break;
        default:
          break;
      }
    },
    selector: { type: 'system_info' },
  });

  const { disk, memory, cpu } = info;

  // Convert bytes to GB
  const diskFree = Math.round(disk.available / 1024 / 1024 / 1024);
  const diskSize = Math.round(disk.total / 1024 / 1024 / 1024);
  const diskUsed = diskSize - diskFree;
  const percentUsed = Math.round((diskUsed / diskSize) * 100);

  const memoryTotal = Math.round(Number(memory.total) / 1024 / 1024 / 1024);
  const memoryFree = Math.round(Number(memory.available) / 1024 / 1024 / 1024);
  const percentUsedMemory = Math.round(((memoryTotal - memoryFree) / memoryTotal) * 100);

  const t = useTranslations('dashboard');

  return (
    <div className="row row-deck row-cards">
      <SystemStat
        title={t('cards.disk.title')}
        metric={`${diskUsed} GB`}
        subtitle={t('cards.disk.subtitle', { total: diskSize })}
        icon={IconDatabase}
        progress={percentUsed}
      />
      <SystemStat
        title={t('cards.cpu.title')}
        metric={`${cpu.load.toFixed(2)}%`}
        subtitle={t('cards.cpu.subtitle')}
        icon={IconCpu}
        progress={cpu.load}
      />
      <SystemStat
        title={t('cards.memory.title')}
        metric={`${percentUsedMemory || 0}%`}
        subtitle={`${memoryTotal} GB`}
        icon={IconCircuitResistor}
        progress={percentUsedMemory}
      />
    </div>
  );
};
