import {
  appsUsageOptions,
  getInstalledAppsOptions,
  systemHistoryOptions,
  systemInfoOptions,
  systemLoadOptions,
} from '@/api-client/@tanstack/react-query.gen';
import { IconArrowsDownUp, IconCircuitResistor, IconCpu, IconDatabase } from '@tabler/icons-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppLauncher } from '../components/app-launcher/app-launcher';
import { AppsUsageCard } from '../components/apps-usage/apps-usage-card';
import { AttentionBanner } from '../components/attention-banner';
import { Sparkline } from '../components/sparkline/sparkline';
import { SystemInfoCard } from '../components/system-info-card';
import { SystemStat } from '../components/system-stat';
import { formatBytes, formatPercent, formatRate, formatTime, getSeverity, severityClass } from '../helpers/format';
import clsx from 'clsx';

const STAT_CLASS = 'col-sm-6 col-xl-3';

export default () => {
  const { t, i18n } = useTranslation();

  const { data } = useSuspenseQuery({ ...systemLoadOptions(), refetchInterval: 5000 });
  const { data: history } = useSuspenseQuery({ ...systemHistoryOptions(), refetchInterval: 10000 });
  const { data: info } = useSuspenseQuery({ ...systemInfoOptions(), refetchInterval: 60000 });
  const { data: appsUsage } = useSuspenseQuery({ ...appsUsageOptions(), refetchInterval: 10000 });
  const {
    data: { installed },
  } = useSuspenseQuery({ ...getInstalledAppsOptions() });

  const formatTimestamp = (timestamp: number) => formatTime(timestamp, i18n.language);
  const networkHistory = history.networkRx.map((rx, i) => rx + (history.networkTx[i] ?? 0));
  const extraDisks = data.disks.filter((disk) => disk.mount !== '/').slice(0, 3);

  return (
    <div className="row row-deck row-cards px-1">
      <AttentionBanner installed={installed} load={data} />
      <AppLauncher installed={installed} />

      <SystemStat
        className={STAT_CLASS}
        title={t('DASHBOARD_CPU_TITLE')}
        metric={formatPercent(data.cpuLoad)}
        subtitle={
          data.cpuTemperature
            ? t('DASHBOARD_CPU_TEMPERATURE', { temperature: Math.round(data.cpuTemperature), count: info.cpuCores })
            : t('DASHBOARD_CPU_CORES', { count: info.cpuCores })
        }
        icon={IconCpu}
        progress={data.cpuLoad}
      >
        <Sparkline
          timestamps={history.timestamps}
          values={history.cpu}
          max={100}
          label={t('DASHBOARD_CPU_TITLE')}
          formatValue={(value) => formatPercent(value)}
          formatTimestamp={formatTimestamp}
        />
      </SystemStat>

      <SystemStat
        className={STAT_CLASS}
        title={t('DASHBOARD_MEMORY_TITLE')}
        metric={formatPercent(data.percentUsedMemory)}
        subtitle={`${t('DASHBOARD_MEMORY_SUBTITLE', { used: formatBytes(data.memoryUsedBytes), total: formatBytes(data.memoryTotalBytes) })}${
          data.memorySource === 'containers' ? ` · ${t('DASHBOARD_MEMORY_ESTIMATED')}` : ''
        }`}
        icon={IconCircuitResistor}
        progress={data.percentUsedMemory}
      >
        <Sparkline
          timestamps={history.timestamps}
          values={history.memory}
          max={100}
          label={t('DASHBOARD_MEMORY_TITLE')}
          formatValue={(value) => formatPercent(value)}
          formatTimestamp={formatTimestamp}
        />
      </SystemStat>

      <SystemStat
        className={STAT_CLASS}
        title={t('DASHBOARD_DISK_SPACE_TITLE')}
        metric={`${data.diskUsed} GB`}
        subtitle={t('DASHBOARD_DISK_SPACE_SUBTITLE', { total: data.diskSize })}
        icon={IconDatabase}
        progress={data.percentUsed}
      >
        {extraDisks.length > 0 && (
          <div className="d-flex flex-column gap-2">
            {extraDisks.map((disk) => (
              <div key={disk.fs} className="small">
                <div className="d-flex justify-content-between gap-2">
                  <span className="text-truncate text-secondary" title={disk.fs}>
                    {disk.mount}
                  </span>
                  <span className="text-nowrap">
                    {formatBytes(disk.used, 0)} / {formatBytes(disk.size, 0)}
                  </span>
                </div>
                <div className="progress progress-xs mt-1">
                  <div
                    className={clsx('progress-bar', severityClass[getSeverity(disk.percentUsed)])}
                    style={{ width: `${disk.percentUsed}%` }}
                    role="progressbar"
                    aria-valuenow={Math.round(disk.percentUsed)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={disk.mount}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </SystemStat>

      <SystemStat
        className={STAT_CLASS}
        title={t('DASHBOARD_NETWORK_TITLE')}
        metric={formatRate(data.networkRxBytesPerSec + data.networkTxBytesPerSec)}
        subtitle={
          <span title={t('DASHBOARD_NETWORK_HINT')}>
            ↓ {formatRate(data.networkRxBytesPerSec)} · ↑ {formatRate(data.networkTxBytesPerSec)}
          </span>
        }
        icon={IconArrowsDownUp}
      >
        <Sparkline
          timestamps={history.timestamps}
          values={networkHistory}
          label={t('DASHBOARD_NETWORK_TITLE')}
          formatValue={formatRate}
          formatTimestamp={formatTimestamp}
        />
      </SystemStat>

      <div className="col-xl-8 px-1">
        <AppsUsageCard usage={appsUsage} installed={installed} />
      </div>
      <div className="col-xl-4 px-1">
        <SystemInfoCard info={info} />
      </div>
    </div>
  );
};
