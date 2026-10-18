import {
  appsUsageOptions,
  getInstalledAppsOptions,
  systemHistoryOptions,
  systemInfoOptions,
  systemLoadOptions,
} from '@/api-client/@tanstack/react-query.gen';
import { TopBar } from '@/components/layouts/app-shell/top-bar';
import type { RouteHandle } from '@/components/layouts/dashboard/layout';
import { PageHeader } from '@/components/page-header/page-header';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { AppLauncher } from '../components/app-launcher/app-launcher';
import { AppsUsageCard, type SortKey } from '../components/apps-usage/apps-usage-card';
import { AttentionPanel, useAttentionItems } from '../components/attention-banner';
import { Sparkline } from '../components/sparkline/sparkline';
import { SystemInfoCard } from '../components/system-info-card';
import { StatCard } from '../components/system-stat';
import { formatBytes, formatPercent, formatRate, formatTime, formatUptime, getSeverity } from '../helpers/format';
import './dashboard.css';

export const handle: RouteHandle = { ownHeader: true };

const splitUnit = (formatted: string) => {
  const [value = formatted, ...unit] = formatted.split(' ');
  return { value, unit: unit.length ? ` ${unit.join(' ')}` : undefined };
};

export default () => {
  const { t, i18n } = useTranslation();
  const [requestedSort, setRequestedSort] = useState<{ key: SortKey; at: number }>();

  const { data } = useSuspenseQuery({ ...systemLoadOptions(), refetchInterval: 5000 });
  const { data: history } = useSuspenseQuery({ ...systemHistoryOptions(), refetchInterval: 10000 });
  const { data: info } = useSuspenseQuery({ ...systemInfoOptions(), refetchInterval: 60000 });
  const { data: appsUsage } = useSuspenseQuery({ ...appsUsageOptions(), refetchInterval: 10000 });
  const {
    data: { installed },
  } = useSuspenseQuery({ ...getInstalledAppsOptions() });

  const { items, dialogs } = useAttentionItems({
    installed,
    load: data,
    onReview: (key) => {
      setRequestedSort({ key, at: Date.now() });
      document.getElementById('resource-usage')?.scrollIntoView({ behavior: 'smooth' });
    },
  });

  const formatTimestamp = (timestamp: number) => formatTime(timestamp, i18n.language);
  const networkHistory = history.networkRx.map((rx, i) => rx + (history.networkTx[i] ?? 0));
  const networkTotal = data.networkRxBytesPerSec + data.networkTxBytesPerSec;
  const networkPeak = Math.max(...networkHistory, networkTotal, 1);
  const network = splitUnit(formatRate(networkTotal));

  const mainDisk = data.disks.find((disk) => disk.mount === '/') ?? data.disks[0];
  const diskFull = getSeverity(data.percentUsed) === 'danger';
  const diskUsed = splitUnit(formatBytes(mainDisk?.used ?? data.diskUsed * 1024 ** 3, 0));
  const extraDisks = data.disks.filter((disk) => disk !== mainDisk).slice(0, 2);

  return (
    <>
      <TopBar>
        <span className="rt-host-status rt-mono">
          <span className="rt-host-status__dot" aria-hidden="true" />
          {info.hostname} · {t('DASHBOARD_UP_FOR', { uptime: formatUptime(info.uptime) })}
        </span>
      </TopBar>

      <PageHeader
        eyebrow={t('DASHBOARD_EYEBROW')}
        title={t('DASHBOARD_TITLE')}
        subtitle={
          items.length > 0 ? (
            <Trans i18nKey="DASHBOARD_SUBTITLE_ATTENTION" count={items.length} components={{ strong: <strong /> }} />
          ) : (
            t('DASHBOARD_SUBTITLE_HEALTHY')
          )
        }
      />

      <AttentionPanel items={items} title={t('DASHBOARD_ATTENTION_TITLE')} />
      {dialogs}

      <section className="rt-stats" aria-label={t('DASHBOARD_RESOURCES_LABEL')}>
        <StatCard
          label={t('DASHBOARD_STAT_CPU')}
          meta={
            data.cpuTemperature
              ? `${Math.round(data.cpuTemperature)}°C · ${t('DASHBOARD_CPU_CORES', { count: info.cpuCores })}`
              : t('DASHBOARD_CPU_CORES', { count: info.cpuCores })
          }
          value={formatPercent(data.cpuLoad).replace('%', '')}
          unit="%"
          progress={data.cpuLoad}
        >
          <Sparkline
            className="rt-stat__spark"
            timestamps={history.timestamps}
            values={history.cpu}
            max={100}
            label={t('DASHBOARD_STAT_CPU')}
            formatValue={(value) => formatPercent(value)}
            formatTimestamp={formatTimestamp}
          />
        </StatCard>

        <StatCard
          label={t('DASHBOARD_STAT_MEMORY')}
          meta={`${formatBytes(data.memoryUsedBytes)} / ${formatBytes(data.memoryTotalBytes)}${data.memorySource === 'containers' ? ` · ${t('DASHBOARD_MEMORY_ESTIMATED')}` : ''}`}
          value={formatPercent(data.percentUsedMemory).replace('%', '')}
          unit="%"
          progress={data.percentUsedMemory}
          meterTone={getSeverity(data.percentUsedMemory) === 'danger' ? 'danger' : 'default'}
        >
          <Sparkline
            className="rt-stat__spark"
            timestamps={history.timestamps}
            values={history.memory}
            max={100}
            label={t('DASHBOARD_STAT_MEMORY')}
            formatValue={(value) => formatPercent(value)}
            formatTimestamp={formatTimestamp}
          />
        </StatCard>

        <StatCard
          label={`${t('DASHBOARD_STAT_DISK')} · ${formatPercent(data.percentUsed, 0)}`}
          meta={t('DASHBOARD_DISK_OF', { total: formatBytes(mainDisk?.size ?? data.diskSize * 1024 ** 3, 0) })}
          value={diskUsed.value}
          unit={diskUsed.unit}
          progress={data.percentUsed}
          tone={diskFull ? 'danger' : 'default'}
          meterTone={diskFull ? 'danger' : 'default'}
        >
          {diskFull ? (
            <p className="rt-stat__note">{t('DASHBOARD_DISK_FULL_NOTE', { available: formatBytes(mainDisk?.available ?? 0, 0) })}</p>
          ) : (
            <div className="rt-stat__disks">
              {extraDisks.length === 0 && (
                <p className="rt-stat__note">{t('DASHBOARD_DISK_FREE', { available: formatBytes(mainDisk?.available ?? 0, 0) })}</p>
              )}
              {extraDisks.map((disk) => (
                <div key={disk.fs} className="rt-stat__disk" title={disk.fs}>
                  <span className="rt-mono">{disk.mount}</span>
                  <span className="rt-mono">
                    {formatBytes(disk.used, 0)} / {formatBytes(disk.size, 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </StatCard>

        <StatCard
          label={t('DASHBOARD_STAT_NETWORK')}
          meta={
            <span title={t('DASHBOARD_NETWORK_HINT')}>
              ↓ {formatRate(data.networkRxBytesPerSec)} · ↑ {formatRate(data.networkTxBytesPerSec)}
            </span>
          }
          value={network.value}
          unit={network.unit}
          progress={(networkTotal / networkPeak) * 100}
          meterTone="accent"
        >
          <Sparkline
            className="rt-stat__spark rt-stat__spark--accent"
            timestamps={history.timestamps}
            values={networkHistory}
            label={t('DASHBOARD_STAT_NETWORK')}
            formatValue={formatRate}
            formatTimestamp={formatTimestamp}
          />
        </StatCard>
      </section>

      <AppLauncher installed={installed} />

      <div className="rt-dashboard-split">
        <AppsUsageCard usage={appsUsage} installed={installed} requestedSort={requestedSort} />
        <SystemInfoCard info={info} />
      </div>
    </>
  );
};
