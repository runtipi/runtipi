import type { LoadDto, MyAppsDto } from '@/api-client';
import { useAppContext } from '@/context/app-context';
import { UpdateAllButton } from '@/modules/app/components/update-all-button/update-all-button';
import { IconAlertTriangle, IconArrowUpCircle, IconDownload, IconRotateClockwise, type IconAperture } from '@tabler/icons-react';
import clsx from 'clsx';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import semver from 'semver';
import { isUpdateAvailable } from '../helpers/app-urls';
import { formatPercent } from '../helpers/format';

type Item = {
  id: string;
  level: 'danger' | 'warning' | 'info';
  icon: typeof IconAperture;
  title: React.ReactNode;
  action?: React.ReactNode;
};

const getAppLink = (urn: string) => {
  const [appName, storeId] = urn.split(':');
  return `/apps/${storeId}/${appName}`;
};

type Props = {
  installed: MyAppsDto['installed'];
  load: LoadDto;
};

export const AttentionBanner = ({ installed, load }: Props) => {
  const { t } = useTranslation();
  const { version } = useAppContext();
  const items: Item[] = [];

  // Disks and memory close to full
  for (const disk of load.disks) {
    if (disk.percentUsed >= 90) {
      items.push({
        id: `disk-${disk.fs}`,
        level: 'danger',
        icon: IconAlertTriangle,
        title: t('DASHBOARD_ATTENTION_DISK_FULL', { percent: formatPercent(disk.percentUsed, 0), mount: disk.mount }),
      });
    }
  }

  if (load.percentUsedMemory >= 90) {
    items.push({
      id: 'memory',
      level: 'warning',
      icon: IconAlertTriangle,
      title: t('DASHBOARD_ATTENTION_MEMORY_HIGH', { percent: formatPercent(load.percentUsedMemory, 0) }),
    });
  }

  // Apps waiting for a restart to apply new settings
  const pendingRestart = installed.filter(({ app }) => app.pendingRestart);
  if (pendingRestart.length > 0) {
    items.push({
      id: 'pending-restart',
      level: 'warning',
      icon: IconRotateClockwise,
      title: (
        <>
          {t('DASHBOARD_ATTENTION_PENDING_RESTART', { count: pendingRestart.length })}{' '}
          {pendingRestart.map(({ info }, index) => (
            <span key={info.urn}>
              {index > 0 && ', '}
              <Link to={getAppLink(info.urn)}>{info.name}</Link>
            </span>
          ))}
        </>
      ),
    });
  }

  // App updates
  const updates = installed.filter(isUpdateAvailable);
  if (updates.length > 0) {
    items.push({
      id: 'app-updates',
      level: 'info',
      icon: IconDownload,
      title: (
        <>
          {t('DASHBOARD_ATTENTION_APP_UPDATES', { count: updates.length })}{' '}
          {updates.slice(0, 5).map(({ info }, index) => (
            <span key={info.urn}>
              {index > 0 && ', '}
              <Link to={getAppLink(info.urn)}>{info.name}</Link>
            </span>
          ))}
          {updates.length > 5 && ` ${t('DASHBOARD_ATTENTION_AND_MORE', { count: updates.length - 5 })}`}
        </>
      ),
      action: updates.length > 1 ? <UpdateAllButton /> : undefined,
    });
  }

  // Runtipi update
  const runtipiUpdate =
    version.current !== 'nightly' && semver.valid(version.current) && semver.valid(version.latest) && semver.lt(version.current, version.latest);
  if (runtipiUpdate) {
    items.push({
      id: 'runtipi-update',
      level: 'info',
      icon: IconArrowUpCircle,
      title: t('DASHBOARD_ATTENTION_RUNTIPI_UPDATE', { version: version.latest, current: version.current }),
      action: (
        <Link to="/settings" className="btn btn-sm">
          {t('DASHBOARD_ATTENTION_VIEW')}
        </Link>
      ),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="col-12 px-1" data-testid="attention-banner">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{t('DASHBOARD_ATTENTION_TITLE')}</h3>
          <span className="badge bg-secondary-lt ms-2">{items.length}</span>
        </div>
        <div className="list-group list-group-flush">
          {items.map(({ id, level, icon: Icon, title, action }) => (
            <div key={id} className="list-group-item d-flex align-items-center gap-2 flex-wrap">
              <div className="d-flex align-items-center gap-3 flex-fill" style={{ flexBasis: '16rem' }}>
                <Icon className={clsx('flex-shrink-0', `text-${level}`)} size={20} aria-hidden="true" />
                <div>{title}</div>
              </div>
              {action && <div className="flex-shrink-0 ms-auto">{action}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
