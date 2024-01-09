'use client';

import { IconCircuitResistor, IconCpu, IconDatabase } from '@tabler/icons-react';
import React, { useState } from 'react';
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
  const [info, setInfo] = useState(props);

  useSocket({
    onEvent: (_, data) => {
      setInfo(data);
    },
    selector: { type: 'system_info' },
  });

  const t = useTranslations('dashboard');

  return (
    <div className="row row-deck row-cards">
      <SystemStat
        title={t('cards.disk.title')}
        metric={`${info.diskUsed} GB`}
        subtitle={t('cards.disk.subtitle', { total: info.diskSize })}
        icon={IconDatabase}
        progress={info.percentUsed}
      />
      <SystemStat
        title={t('cards.cpu.title')}
        metric={`${info.cpuLoad.toFixed(2)}%`}
        subtitle={t('cards.cpu.subtitle')}
        icon={IconCpu}
        progress={info.cpuLoad}
      />
      <SystemStat
        title={t('cards.memory.title')}
        metric={`${info.percentUsedMemory || 0}%`}
        subtitle={`${info.memoryTotal} GB`}
        icon={IconCircuitResistor}
        progress={info.percentUsedMemory}
      />
    </div>
  );
};
