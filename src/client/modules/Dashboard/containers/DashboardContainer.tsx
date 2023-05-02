import { IconCircuitResistor, IconCpu, IconDatabase } from '@tabler/icons-react';
import React from 'react';
import { useTranslations } from 'next-intl';
import { SystemRouterOutput } from '../../../../server/routers/system/system.router';
import SystemStat from '../components/SystemStat';

type IProps = { data: SystemRouterOutput['systemInfo'] };

export const DashboardContainer: React.FC<IProps> = ({ data }) => {
  const { disk, memory, cpu } = data;
  const t = useTranslations('Dashboard');
  // Convert bytes to GB
  const diskFree = Math.round(disk.available / 1024 / 1024 / 1024);
  const diskSize = Math.round(disk.total / 1024 / 1024 / 1024);
  const diskUsed = diskSize - diskFree;
  const percentUsed = Math.round((diskUsed / diskSize) * 100);

  const memoryTotal = Math.round(Number(memory.total) / 1024 / 1024 / 1024);
  const memoryFree = Math.round(Number(memory.available) / 1024 / 1024 / 1024);
  const percentUsedMemory = Math.round(((memoryTotal - memoryFree) / memoryTotal) * 100);

  return (
    <div className="row row-deck row-cards">
      <SystemStat title={t('cards.disk.title')} metric={`${diskUsed} GB`} subtitle={t('cards.disk.subtitle', { total: diskSize })} icon={IconDatabase} progress={percentUsed} />
      <SystemStat title={t('cards.cpu.title')} metric={`${cpu.load.toFixed(2)}%`} subtitle={t('cards.cpu.subtitle')} icon={IconCpu} progress={cpu.load} />
      <SystemStat title={t('cards.memory.title')} metric={`${percentUsedMemory || 0}%`} subtitle={`${memoryTotal} GB`} icon={IconCircuitResistor} progress={percentUsedMemory} />
    </div>
  );
};
