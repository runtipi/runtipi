import { IconCircuitResistor, IconCpu, IconDatabase } from '@tabler/icons';
import React from 'react';
import { SystemRouterOutput } from '../../../../server/routers/system/system.router';
import SystemStat from '../components/SystemStat';

type IProps = { data: SystemRouterOutput['systemInfo'] };

export const DashboardContainer: React.FC<IProps> = ({ data }) => {
  const { disk, memory, cpu } = data;
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
      <SystemStat title="Disk space" metric={`${diskUsed} GB`} subtitle={`Used out of ${diskSize} GB`} icon={IconDatabase} progress={percentUsed} />
      <SystemStat title="CPU Load" metric={`${cpu.load.toFixed(2)}%`} subtitle="Uninstall apps if there is to much load" icon={IconCpu} progress={cpu.load} />
      <SystemStat title="Memory Used" metric={`${percentUsedMemory || 0}%`} subtitle={`${memoryTotal} GB`} icon={IconCircuitResistor} progress={percentUsedMemory} />
    </div>
  );
};
