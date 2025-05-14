import { systemLoadOptions } from '@/api-client/@tanstack/react-query.gen';
import { IconCircuitResistor, IconCpu, IconDatabase } from '@tabler/icons-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SystemStat } from '../components/system-stat';

export default () => {
  const { t } = useTranslation();
  const { data } = useSuspenseQuery({
    ...systemLoadOptions(),
    refetchInterval: 3000,
  });
  const isLoading = !data;

  return (
    <div className="row row-deck row-cards">
      <SystemStat
        isLoading={isLoading}
        title={t('DASHBOARD_DISK_SPACE_TITLE')}
        metric={`${data?.diskUsed} GB`}
        subtitle={t('DASHBOARD_DISK_SPACE_SUBTITLE', { total: data?.diskSize })}
        icon={IconDatabase}
        progress={data?.percentUsed ?? 0}
      />
      <SystemStat
        isLoading={isLoading}
        title={t('DASHBOARD_CPU_TITLE')}
        metric={`${data.cpuLoad?.toFixed(2)}%`}
        subtitle={t('DASHBOARD_CPU_SUBTITLE')}
        icon={IconCpu}
        progress={data?.cpuLoad ?? 0}
      />
      <SystemStat
        isLoading={isLoading}
        title={t('DASHBOARD_MEMORY_TITLE')}
        metric={`${data?.percentUsedMemory}%`}
        subtitle={`${data?.memoryTotal} GB`}
        icon={IconCircuitResistor}
        progress={data?.percentUsedMemory ?? 0}
      />
    </div>
  );
};
