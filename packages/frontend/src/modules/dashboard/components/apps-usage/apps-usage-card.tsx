import type { AppsUsageDto, MyAppsDto } from '@/api-client';
import { AppIcon } from '@/components/app-icon/app-icon';
import { RuntipiLogo } from '@/components/layouts/app-shell/runtipi-logo';
import { getAppPath } from '@/modules/app/components/app-open-menu/app-open-menu';
import { IconBox, IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react';
import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { formatBytes, formatPercent, formatTime } from '../../helpers/format';
import { Sparkline } from '../sparkline/sparkline';
import './apps-usage-card.css';

export type SortKey = 'cpu' | 'memory' | 'disk';
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
  /** Sort by this column, e.g. when the user reviews a full disk */
  requestedSort?: { key: SortKey; at: number };
};

export const AppsUsageCard = ({ usage, installed, requestedSort }: Props) => {
  const { t, i18n } = useTranslation();
  const [sort, setSort] = useState<Sort>({ key: 'memory', direction: 'desc' });
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (requestedSort) setSort({ key: requestedSort.key, direction: 'desc' });
  }, [requestedSort]);

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

  const renderLogo = (app: UsageApp) => {
    if (app.id === 'runtipi' || app.id === 'other') {
      return (
        <span className={`rt-tile ${app.id === 'runtipi' ? 'rt-cat--core' : ''}`} style={{ width: 36, height: 36 }}>
          <span className="rt-tile__face">{app.id === 'runtipi' ? <RuntipiLogo size={18} /> : <IconBox size={18} aria-hidden="true" />}</span>
        </span>
      );
    }
    const info = appsByUrn.get(app.id);
    return <AppIcon name={getName(app.id)} urn={app.id} categories={info?.categories} size={36} inactive={app.containers === 0} />;
  };

  const renderName = (app: UsageApp) => {
    if (!app.id.includes(':')) return <span className="apps-usage-name">{getName(app.id)}</span>;
    return (
      <Link to={getAppPath(app.id)} className="apps-usage-name">
        {getName(app.id)}
      </Link>
    );
  };

  const renderDisk = (app: UsageApp) => {
    if (!app.disk) {
      if (app.id === 'runtipi' || app.id === 'other') return <span className="apps-usage-empty">—</span>;
      return <span className="apps-usage-empty">{usage.diskMeasuredAt ? '—' : t('DASHBOARD_APPS_USAGE_DISK_MEASURING')}</span>;
    }

    const sharedSize = app.disk.shared.reduce((sum, id) => sum + (sharedById.get(id)?.size ?? 0), 0);

    return (
      <div className="apps-usage-value" title={describeDisk(app.disk, t)}>
        <span className="apps-usage-num">{formatBytes(app.disk.total)}</span>
        {app.disk.shared.length > 0 && (
          <span className="apps-usage-sub">{t('DASHBOARD_APPS_USAGE_DISK_SHARED', { value: formatBytes(sharedSize) })}</span>
        )}
        {app.disk.unmeasured.length > 0 && (
          <span className="apps-usage-sub apps-usage-sub--warn">
            {t('DASHBOARD_APPS_USAGE_DISK_UNMEASURED_COUNT', { count: app.disk.unmeasured.length })}
          </span>
        )}
      </div>
    );
  };

  return (
    <section className="rt-panel apps-usage" id="resource-usage" aria-labelledby="apps-usage-title" data-testid="apps-usage">
      <div className="apps-usage-head">
        <h2 id="apps-usage-title" className="rt-display">
          {t('DASHBOARD_APPS_USAGE_TITLE')}
        </h2>
        <p>
          {usage.diskMeasuredAt
            ? t('DASHBOARD_APPS_USAGE_SUBTITLE', { time: formatTimestamp(usage.diskMeasuredAt) })
            : t('DASHBOARD_APPS_USAGE_SUBTITLE_MEASURING')}
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="apps-usage-none">{t('DASHBOARD_APPS_USAGE_EMPTY')}</div>
      ) : (
        <div className="apps-usage-scroll">
          <table className="apps-usage-table">
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
                      <div className={`apps-usage-app ${isRunning ? '' : 'apps-usage-app--off'}`}>
                        {renderLogo(app)}
                        <div className="apps-usage-app__text">
                          {renderName(app)}
                          <span className={`apps-usage-sub ${isRunning ? '' : 'apps-usage-sub--off'}`}>
                            {isRunning ? t('DASHBOARD_APPS_USAGE_CONTAINERS', { count: app.containers }) : t('APP_STATUS_STOPPED')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="apps-usage-metric">
                      {isRunning ? (
                        <div className="apps-usage-cell">
                          <span className="apps-usage-num">{formatPercent(app.cpu)}</span>
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
                        <span className="apps-usage-empty">—</span>
                      )}
                    </td>
                    <td className="apps-usage-metric">
                      {isRunning ? (
                        <div className="apps-usage-cell">
                          <span className="apps-usage-num">{formatBytes(app.memory)}</span>
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
                        <span className="apps-usage-empty">—</span>
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
        <div className="apps-usage-more">
          <button type="button" className="rt-btn rt-btn--sm" onClick={() => setShowAll((value) => !value)}>
            {showAll ? t('DASHBOARD_APPS_USAGE_SHOW_LESS') : t('DASHBOARD_APPS_USAGE_SHOW_ALL', { count: rows.length })}
          </button>
        </div>
      )}
      {usage.sharedStorage.length > 0 && (
        <div className="apps-usage-shared-list">
          <div className="rt-eyebrow">{t('DASHBOARD_APPS_USAGE_SHARED_TITLE')}</div>
          <ul>
            {usage.sharedStorage.map((shared) => (
              <li key={shared.id} className="apps-usage-shared">
                <span className="rt-chiptag">{t(`DASHBOARD_APPS_USAGE_SHARED_KIND_${shared.kind.toUpperCase()}`)}</span>
                <code className="rt-mono" title={shared.sources.join(', ')}>
                  {shared.sources.join(', ')}
                </code>
                <span className="apps-usage-num">{formatBytes(shared.size)}</span>
                <span className="apps-usage-sub">{shared.apps.map(getName).join(', ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
