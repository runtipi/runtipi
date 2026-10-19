import type { SystemInfoDto } from '@/api-client';
import { isRuntipiUpdateAvailable } from '@/components/layouts/app-shell/sidebar';
import { useAppContext } from '@/context/app-context';
import { IconArrowUpRight } from '@tabler/icons-react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { formatUptime } from '../helpers/format';

export const SystemInfoCard = ({ info }: { info: SystemInfoDto }) => {
  const { t } = useTranslation();
  const { version } = useAppContext();

  const rows: { label: string; value: React.ReactNode; mono?: boolean }[] = [
    {
      label: t('DASHBOARD_SYSTEM_INFO_RUNTIPI'),
      value: (
        <>
          {version.current}
          {isRuntipiUpdateAvailable(version) && (
            <Link
              to="/settings?tab=updates"
              className="rt-system__update rt-mono"
              title={t('DASHBOARD_SYSTEM_INFO_UPDATE_AVAILABLE', { version: version.latest })}
            >
              {version.latest}
              <IconArrowUpRight size={13} stroke={1.8} aria-hidden="true" />
            </Link>
          )}
        </>
      ),
    },
    { label: t('DASHBOARD_SYSTEM_INFO_HOSTNAME'), value: info.hostname, mono: true },
    { label: t('DASHBOARD_SYSTEM_INFO_OS'), value: info.os },
    { label: t('DASHBOARD_SYSTEM_INFO_KERNEL'), value: `${info.kernel} (${info.architecture})`, mono: true },
    {
      label: t('DASHBOARD_SYSTEM_INFO_CPU'),
      value: info.cpuModel
        ? `${info.cpuModel} · ${t('DASHBOARD_SYSTEM_INFO_CORES', { count: info.cpuCores })}`
        : t('DASHBOARD_SYSTEM_INFO_CORES', { count: info.cpuCores }),
    },
    { label: t('DASHBOARD_SYSTEM_INFO_DOCKER'), value: info.dockerVersion || '—', mono: true },
    { label: t('DASHBOARD_SYSTEM_INFO_UPTIME'), value: formatUptime(info.uptime, t), mono: true },
  ];

  return (
    <section className="rt-panel rt-system" aria-labelledby="rt-system-title">
      <h2 id="rt-system-title" className="rt-display">
        {t('DASHBOARD_SYSTEM_INFO_TITLE')}
      </h2>
      <dl>
        {rows.map(({ label, value, mono }) => (
          <div key={label} className="rt-system__row">
            <dt>{label}</dt>
            <dd className={mono ? 'rt-mono rt-system__mono' : undefined}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
