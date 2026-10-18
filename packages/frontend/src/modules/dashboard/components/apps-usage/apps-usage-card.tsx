import type { AppsUsageDto, MyAppsDto } from '@/api-client';
import { AppLogo } from '@/components/app-logo/app-logo';
import { IconBox, IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { formatBytes, formatPercent, formatTime } from '../../helpers/format';
import { Sparkline } from '../sparkline/sparkline';
import './apps-usage-card.css';

type SortKey = 'cpu' | 'memory' | 'disk';
type Sort = { key: SortKey; direction: 'asc' | 'desc' };
type UsageApp = AppsUsageDto['apps'][number];

const DEFAULT_VISIBLE = 10;

/** Value to sort by, null when the app has no value (stopped, or disk not measured) */
const sortValue = (app: UsageApp, key: SortKey) => {
  if (key === 'disk') return app.disk?.total ?? null;
  return app.containers > 0 ? app[key] : null;
};

const describeDisk = (disk: NonNullable<UsageApp['disk']>, t: TFunction) =>
  [
    t('DASHBOARD_APPS_USAGE_DISK_DATA', { value: formatBytes(disk.data) }),
    t('DASHBOARD_APPS_USAGE_DISK_VOLUMES', { value: formatBytes(disk.volumes) }),
    t('DASHBOARD_APPS_USAGE_DISK_CONTAINERS', { value: formatBytes(disk.containers) }),
    t('DASHBOARD_APPS_USAGE_DISK_IMAGES', { value: formatBytes(disk.images) }),
    ...disk.unmeasured.map((p) => t('DASHBOARD_APPS_USAGE_DISK_UNMEASURED', { path: p })),
  ].join('\n');

type Props = {
  usage: AppsUsageDto;
  installed: MyAppsDto['installed'];
};

export const AppsUsageCard = ({ usage, installed }: Props) => {
  const { t, i18n } = useTranslation();
  const [sort, setSort] = useState<Sort>({ key: 'memory', direction: 'desc' });
  const [showAll, setShowAll] = useState(false);

  const appsByUrn = new Map(installed.map((app) => [app.info.urn, app.info]));
  const sharedById = new Map(usage.sharedStorage.map((shared) => [shared.id, shared]));
  const getName = (id: string) => {
    if (id === 'runtipi') return 'Runtipi';
    if (id === 'other') return t('DASHBOARD_APPS_USAGE_OTHER');
    return appsByUrn.get(id)?.name ?? id.split(':')[0] ?? id;
  };

  const rows = [...usage.apps].sort((a, b) => {
    const valueA = sortValue(a, sort.key);
    const valueB = sortValue(b, sort.key);
    // Rows without a value always come last
    if (valueA === null || valueB === null) {
      return (valueA === null ? 1 : 0) - (valueB === null ? 1 : 0) || getName(a.id).localeCompare(getName(b.id));
    }
    const diff = valueA - valueB;
    return (sort.direction === 'asc' ? diff : -diff) || getName(a.id).localeCompare(getName(b.id));
  });
  const visibleRows = showAll ? rows : rows.slice(0, DEFAULT_VISIBLE);
  const formatTimestamp = (timestamp: number) => formatTime(timestamp, i18n.language);

  const onSort = (key: SortKey) => {
    setSort((current) => ({ key, direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc' }));
  };

  const renderHeader = (key: SortKey, label: string) => {
    const active = sort.key === key;
    const SortIcon = active ? (sort.direction === 'asc' ? IconChevronUp : IconChevronDown) : IconSelector;

    return (
      <th className="apps-usage-metric" aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className="apps-usage-sort" onClick={() => onSort(key)}>
          {label}
          <SortIcon size={14} aria-hidden="true" />
        </button>
      </th>
    );
  };

  const renderLogo = (id: string) => {
    if (id === 'runtipi') return <AppLogo url="/tipi.png" size={32} alt="" />;
    if (id === 'other') {
      return (
        <span className="apps-usage-placeholder">
          <IconBox size={18} aria-hidden="true" />
        </span>
      );
    }
    return <AppLogo urn={id} size={32} alt="" />;
  };

  const renderName = (id: string) => {
    const [appName, storeId] = id.split(':');
    if (!storeId) return <span className="fw-bold text-truncate">{getName(id)}</span>;
    return (
      <Link to={`/apps/${storeId}/${appName}`} className="fw-bold text-reset text-truncate">
        {getName(id)}
      </Link>
    );
  };

  const renderDisk = (app: UsageApp) => {
    if (!app.disk) {
      if (app.id === 'runtipi' || app.id === 'other') return <span className="text-secondary">-</span>;
      return <span className="text-secondary">{usage.diskMeasuredAt ? '-' : t('DASHBOARD_APPS_USAGE_DISK_MEASURING')}</span>;
    }

    const sharedSize = app.disk.shared.reduce((sum, id) => sum + (sharedById.get(id)?.size ?? 0), 0);

    return (
      <div className="apps-usage-value" title={describeDisk(app.disk, t)}>
        <strong>{formatBytes(app.disk.total)}</strong>
        {app.disk.shared.length > 0 && (
          <span className="text-secondary small">{t('DASHBOARD_APPS_USAGE_DISK_SHARED', { value: formatBytes(sharedSize) })}</span>
        )}
        {app.disk.unmeasured.length > 0 && (
          <span className="text-warning small">{t('DASHBOARD_APPS_USAGE_DISK_UNMEASURED_COUNT', { count: app.disk.unmeasured.length })}</span>
        )}
      </div>
    );
  };

  return (
    <div className="card" data-testid="apps-usage">
      <div className="card-header">
        <div>
          <h3 className="card-title">{t('DASHBOARD_APPS_USAGE_TITLE')}</h3>
          <div className="card-subtitle text-secondary small mb-0">
            {usage.diskMeasuredAt
              ? t('DASHBOARD_APPS_USAGE_SUBTITLE', { time: formatTimestamp(usage.diskMeasuredAt) })
              : t('DASHBOARD_APPS_USAGE_SUBTITLE_MEASURING')}
          </div>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="card-body text-center text-secondary">{t('DASHBOARD_APPS_USAGE_EMPTY')}</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-vcenter card-table apps-usage-table">
            <thead>
              <tr>
                <th>{t('DASHBOARD_APPS_USAGE_APP')}</th>
                {renderHeader('cpu', t('DASHBOARD_APPS_USAGE_CPU'))}
                {renderHeader('memory', t('DASHBOARD_APPS_USAGE_MEMORY'))}
                {renderHeader('disk', t('DASHBOARD_APPS_USAGE_DISK'))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((app) => {
                const isRunning = app.containers > 0;
                const name = getName(app.id);

                return (
                  <tr key={app.id}>
                    <td>
                      <div className="apps-usage-app">
                        {renderLogo(app.id)}
                        <div className="d-flex flex-column min-w-0">
                          {renderName(app.id)}
                          <span className="text-secondary small">
                            {isRunning ? t('DASHBOARD_APPS_USAGE_CONTAINERS', { count: app.containers }) : t('APP_STATUS_STOPPED')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="apps-usage-metric">
                      {isRunning ? (
                        <div className="apps-usage-cell">
                          <strong>{formatPercent(app.cpu)}</strong>
                          <Sparkline
                            className="apps-usage-sparkline"
                            timestamps={app.history.timestamps}
                            values={app.history.cpu}
                            height={24}
                            label={`${name} ${t('DASHBOARD_APPS_USAGE_CPU')}`}
                            formatValue={(value) => formatPercent(value)}
                            formatTimestamp={formatTimestamp}
                          />
                        </div>
                      ) : (
                        <span className="text-secondary">-</span>
                      )}
                    </td>
                    <td className="apps-usage-metric">
                      {isRunning ? (
                        <div className="apps-usage-cell">
                          <strong>{formatBytes(app.memory)}</strong>
                          <Sparkline
                            className="apps-usage-sparkline"
                            timestamps={app.history.timestamps}
                            values={app.history.memory}
                            height={24}
                            label={`${name} ${t('DASHBOARD_APPS_USAGE_MEMORY')}`}
                            formatValue={(value) => formatBytes(value)}
                            formatTimestamp={formatTimestamp}
                          />
                        </div>
                      ) : (
                        <span className="text-secondary">-</span>
                      )}
                    </td>
                    <td className="apps-usage-metric">{renderDisk(app)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > DEFAULT_VISIBLE && (
        <div className="card-footer text-center py-2">
          <button type="button" className="btn btn-link btn-sm" onClick={() => setShowAll((value) => !value)}>
            {showAll ? t('DASHBOARD_APPS_USAGE_SHOW_LESS') : t('DASHBOARD_APPS_USAGE_SHOW_ALL', { count: rows.length })}
          </button>
        </div>
      )}
      {usage.sharedStorage.length > 0 && (
        <div className="card-body border-top">
          <h4 className="subheader mb-2">{t('DASHBOARD_APPS_USAGE_SHARED_TITLE')}</h4>
          <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
            {usage.sharedStorage.map((shared) => (
              <li key={shared.id} className="apps-usage-shared">
                <span className="badge bg-secondary-lt">{t(`DASHBOARD_APPS_USAGE_SHARED_KIND_${shared.kind.toUpperCase()}`)}</span>
                <code className="text-truncate" title={shared.sources.join(', ')}>
                  {shared.sources.join(', ')}
                </code>
                <strong className="text-nowrap">{formatBytes(shared.size)}</strong>
                <span className="text-secondary text-truncate">{shared.apps.map(getName).join(', ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
