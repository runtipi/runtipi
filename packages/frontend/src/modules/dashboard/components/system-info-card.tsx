import type { SystemInfoDto } from '@/api-client';
import { useAppContext } from '@/context/app-context';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import semver from 'semver';
import { formatUptime } from '../helpers/format';

export const SystemInfoCard = ({ info }: { info: SystemInfoDto }) => {
  const { t } = useTranslation();
  const { version } = useAppContext();

  const isLatest =
    version.current === 'nightly' || !semver.valid(version.current) || !semver.valid(version.latest) || semver.gte(version.current, version.latest);

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: t('DASHBOARD_SYSTEM_INFO_RUNTIPI'),
      value: (
        <span className="d-inline-flex align-items-center gap-2 flex-wrap justify-content-end">
          {version.current}
          {isLatest ? (
            <span className="badge bg-green-lt">{t('DASHBOARD_SYSTEM_INFO_UP_TO_DATE')}</span>
          ) : (
            <Link to="/settings" className="badge bg-azure-lt">
              {t('DASHBOARD_SYSTEM_INFO_UPDATE_AVAILABLE', { version: version.latest })}
            </Link>
          )}
        </span>
      ),
    },
    { label: t('DASHBOARD_SYSTEM_INFO_HOSTNAME'), value: info.hostname },
    { label: t('DASHBOARD_SYSTEM_INFO_OS'), value: info.os },
    { label: t('DASHBOARD_SYSTEM_INFO_KERNEL'), value: `${info.kernel} (${info.architecture})` },
    {
      label: t('DASHBOARD_SYSTEM_INFO_CPU'),
      value: info.cpuModel
        ? `${info.cpuModel} · ${t('DASHBOARD_SYSTEM_INFO_CORES', { count: info.cpuCores })}`
        : t('DASHBOARD_SYSTEM_INFO_CORES', { count: info.cpuCores }),
    },
    { label: t('DASHBOARD_SYSTEM_INFO_DOCKER'), value: info.dockerVersion || '-' },
    { label: t('DASHBOARD_SYSTEM_INFO_UPTIME'), value: formatUptime(info.uptime) },
  ];

  return (
    <div className="card h-100">
      <div className="card-header">
        <h3 className="card-title">{t('DASHBOARD_SYSTEM_INFO_TITLE')}</h3>
      </div>
      <div className="card-body">
        <dl className="mb-0">
          {rows.map(({ label, value }) => (
            <div key={label} className="d-flex justify-content-between gap-3 py-1 border-bottom">
              <dt className="text-secondary fw-normal text-nowrap">{label}</dt>
              <dd className="mb-0 text-end text-break">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};
