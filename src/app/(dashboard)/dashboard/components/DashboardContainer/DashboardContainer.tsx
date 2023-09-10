'use client';

import { IconCircuitResistor, IconCpu, IconDatabase } from '@tabler/icons-react';
import React from 'react';
import { useTranslations } from 'next-intl';
import { SystemStat } from '../SystemStat';

type IProps = {
  diskUsed: number;
  diskSize: number;
  percentUsed: number;
  cpuLoad: number;
  memoryTotal: number;
  percentUsedMemory: number;
};

export const DashboardContainer: React.FC<IProps> = (props) => {
  const { diskUsed, diskSize, percentUsed, cpuLoad, memoryTotal, percentUsedMemory } = props;
  const t = useTranslations('dashboard');

  return (
    <div className="row row-deck row-cards">
      <SystemStat title={t('cards.disk.title')} metric={`${diskUsed} GB`} subtitle={t('cards.disk.subtitle', { total: diskSize })} icon={IconDatabase} progress={percentUsed} />
      <SystemStat title={t('cards.cpu.title')} metric={`${cpuLoad.toFixed(2)}%`} subtitle={t('cards.cpu.subtitle')} icon={IconCpu} progress={cpuLoad} />
      <SystemStat title={t('cards.memory.title')} metric={`${percentUsedMemory || 0}%`} subtitle={`${memoryTotal} GB`} icon={IconCircuitResistor} progress={percentUsedMemory} />
    </div>
  );
};
