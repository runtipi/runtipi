import type { LoadDto, MyAppsDto } from '@/api-client';
import { isRuntipiUpdateAvailable } from '@/components/layouts/app-shell/sidebar';
import { useAppContext } from '@/context/app-context';
import { UpdateAllButton } from '@/modules/app/components/update-all-button/update-all-button';
import { RestartDialog } from '@/modules/app/components/dialogs/restart-dialog/restart-dialog';
import { IconArrowUp, IconCircuitResistor, IconDatabase, IconRotateClockwise, type IconAperture } from '@tabler/icons-react';
import clsx from 'clsx';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { RuntipiLogo } from '@/components/layouts/app-shell/runtipi-logo';
import { isUpdateAvailable } from '../helpers/app-urls';
import { formatBytes, formatPercent } from '../helpers/format';

type InstalledApp = MyAppsDto['installed'][number];

export type AttentionItem = {
  id: string;
  tone: 'danger' | 'warning' | 'accent' | 'neutral';
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
};

const icon = (Icon: typeof IconAperture) => <Icon size={18} stroke={1.8} aria-hidden="true" />;

export const padCount = (count: number) => String(count).padStart(2, '0');

/**
 * Things that need the user's attention on the dashboard.
 */
type Options = {
  installed: InstalledApp[];
  load: LoadDto;
  /** Called by the review buttons of resource warnings */
  onReview: (key: 'disk' | 'memory') => void;
};

export const useAttentionItems = ({ installed, load, onReview }: Options) => {
  const { t } = useTranslation();
  const { version } = useAppContext();
  const [restartApp, setRestartApp] = useState<InstalledApp | null>(null);
  const items: AttentionItem[] = [];

  for (const disk of load.disks) {
    if (disk.percentUsed >= 90) {
      items.push({
        id: `disk-${disk.fs}`,
        tone: 'danger',
        icon: icon(IconDatabase),
        title: t('DASHBOARD_ATTENTION_DISK_FULL_TITLE'),
        description: t('DASHBOARD_ATTENTION_DISK_FULL_DESC', {
          percent: formatPercent(disk.percentUsed, 0),
          mount: disk.mount,
          available: formatBytes(disk.available, 0),
        }),
        action: (
          <button type="button" className="rt-btn rt-btn--sm" onClick={() => onReview('disk')}>
            {t('DASHBOARD_ATTENTION_REVIEW')}
          </button>
        ),
      });
    }
  }

  if (load.percentUsedMemory >= 90) {
    items.push({
      id: 'memory',
      tone: 'warning',
      icon: icon(IconCircuitResistor),
      title: t('DASHBOARD_ATTENTION_MEMORY_HIGH_TITLE'),
      description: t('DASHBOARD_ATTENTION_MEMORY_HIGH_DESC', { percent: formatPercent(load.percentUsedMemory, 0) }),
      action: (
        <button type="button" className="rt-btn rt-btn--sm" onClick={() => onReview('memory')}>
          {t('DASHBOARD_ATTENTION_REVIEW')}
        </button>
      ),
    });
  }

  for (const app of installed.filter(({ app }) => app.pendingRestart)) {
    items.push({
      id: `restart-${app.info.urn}`,
      tone: 'warning',
      icon: icon(IconRotateClockwise),
      title: t('DASHBOARD_ATTENTION_RESTART_TITLE', { name: app.info.name }),
      description: t('DASHBOARD_ATTENTION_RESTART_DESC'),
      action:
        app.app.status === 'running' ? (
          <button type="button" className="rt-btn rt-btn--sm" onClick={() => setRestartApp(app)}>
            {t('APP_ACTION_RESTART')}
          </button>
        ) : undefined,
    });
  }

  const updates = installed.filter(isUpdateAvailable);
  if (updates.length > 0) {
    const names = updates.map(({ info }) => info.name);
    items.push({
      id: 'app-updates',
      tone: 'accent',
      icon: icon(IconArrowUp),
      title: t('DASHBOARD_ATTENTION_UPDATES_TITLE', { count: updates.length }),
      description:
        names.length > 4 ? `${names.slice(0, 4).join(', ')} ${t('DASHBOARD_ATTENTION_AND_MORE', { count: names.length - 4 })}` : names.join(', '),
      action: <UpdateAllButton className="rt-btn rt-btn--sm rt-btn--primary" />,
    });
  }

  if (isRuntipiUpdateAvailable(version)) {
    items.push({
      id: 'runtipi-update',
      tone: 'neutral',
      icon: <RuntipiLogo size={18} />,
      title: t('DASHBOARD_ATTENTION_RUNTIPI_TITLE', { version: version.latest }),
      description: t('DASHBOARD_ATTENTION_RUNTIPI_DESC', { version: version.current }),
      action: (
        <Link to="/settings?tab=updates" className="rt-btn rt-btn--sm">
          {t('DASHBOARD_ATTENTION_WHATS_NEW')}
        </Link>
      ),
    });
  }

  const dialogs = restartApp && <RestartDialog isOpen onClose={() => setRestartApp(null)} info={restartApp.info} />;

  return { items, dialogs };
};

type Props = {
  items: AttentionItem[];
  title: string;
};

export const AttentionPanel = ({ items, title }: Props) => {
  if (items.length === 0) return null;

  return (
    <section className="rt-panel rt-panel--warm rt-attention" aria-labelledby="rt-attention-title" data-testid="attention-banner">
      <div className="rt-section-title">
        <h2 id="rt-attention-title">{title}</h2>
        <span className="rt-section-title__count rt-attention__count">{padCount(items.length)}</span>
      </div>
      <div className="rt-attention__grid">
        {items.map((item) => (
          <div key={item.id} className="rt-attention__item">
            <span className={clsx('rt-attn-icon', `rt-attn-icon--${item.tone}`)}>{item.icon}</span>
            <div className="rt-attention__text">
              <div className="rt-attention__title">{item.title}</div>
              <div className="rt-attention__desc">{item.description}</div>
            </div>
            {item.action}
          </div>
        ))}
      </div>
    </section>
  );
};
