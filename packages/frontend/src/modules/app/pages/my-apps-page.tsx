import type { MyAppsDto } from '@/api-client';
import { getInstalledAppsOptions, getLinksOptions, startAppMutation } from '@/api-client/@tanstack/react-query.gen';
import { AppIcon } from '@/components/app-icon/app-icon';
import { TopBar } from '@/components/layouts/app-shell/top-bar';
import type { RouteHandle } from '@/components/layouts/dashboard/layout';
import { PageHeader } from '@/components/page-header/page-header';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import { padCount } from '@/modules/dashboard/components/attention-banner';
import { isUpdateAvailable } from '@/modules/dashboard/helpers/app-urls';
import type { TranslatableError } from '@/types/error.types';
import { IconPlus } from '@tabler/icons-react';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppCard } from '../components/app-card/app-card';
import { getAppPath } from '../components/app-open-menu/app-open-menu';
import { BatchActionsBar } from '../components/batch-actions-bar/batch-actions-bar';
import { AddLinkDialog } from '../components/dialogs/add-link/add-link-dialog';
import { UpdateAllButton } from '../components/update-all-button/update-all-button';
import { LinkCard } from '../components/link-card/link-card';
import './my-apps-page.css';

export const handle: RouteHandle = { ownHeader: true };

type InstalledApp = MyAppsDto['installed'][number];
type Filter = 'all' | 'running' | 'stopped' | 'updates';

const isDown = ({ app }: InstalledApp) => app.status === 'stopped' || app.status === 'missing';

const FILTERS: Record<Filter, (app: InstalledApp) => boolean> = {
  all: () => true,
  running: ({ app }) => app.status === 'running',
  stopped: isDown,
  updates: isUpdateAvailable,
};

const getGroup = (app: InstalledApp) => app.info.categories?.find((category) => category !== 'featured') ?? 'other';

const StartButton = ({ app }: { app: InstalledApp }) => {
  const { t } = useTranslation();
  const startMutation = useMutation({
    ...startAppMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  return (
    <button
      type="button"
      className="rt-btn rt-btn--sm"
      onClick={() => startMutation.mutate({ path: { urn: app.info.urn } })}
      disabled={startMutation.isPending}
    >
      {t('APP_ACTION_START')}
    </button>
  );
};

export default () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const addLinkDisclosure = useDisclosure();

  const {
    data: { installed: allInstalled },
  } = useSuspenseQuery({ ...getInstalledAppsOptions() });
  const {
    data: { links = [] },
  } = useSuspenseQuery({ ...getLinksOptions() });

  const installed = allInstalled.filter(({ info }) => info.available);
  const running = installed.filter(FILTERS.running);
  const down = installed.filter(isDown);
  const updates = installed.filter(isUpdateAvailable);

  const visible = installed.filter(FILTERS[filter]);
  const groups = Object.entries(
    visible.reduce<Record<string, InstalledApp[]>>((acc, app) => {
      const group = getGroup(app);
      acc[group] = [...(acc[group] ?? []), app];
      return acc;
    }, {}),
  )
    .map(([category, apps]) => ({ category, apps: apps.sort((a, b) => a.info.name.localeCompare(b.info.name)) }))
    .sort((a, b) => b.apps.length - a.apps.length || a.category.localeCompare(b.category));

  const showLinks = filter === 'all' && links.length > 0;
  const isEmpty = installed.length === 0 && links.length === 0;

  const chips: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: t('MY_APPS_FILTER_ALL'), count: installed.length },
    { id: 'running', label: t('MY_APPS_FILTER_RUNNING'), count: running.length },
    { id: 'stopped', label: t('MY_APPS_FILTER_STOPPED'), count: down.length },
    { id: 'updates', label: t('MY_APPS_FILTER_UPDATES'), count: updates.length },
  ];

  return (
    <>
      <TopBar>{installed.length > 0 && <BatchActionsBar updatesAvailable={updates.length} onAddLink={addLinkDisclosure.open} />}</TopBar>

      <PageHeader
        eyebrow={t('MY_APPS_EYEBROW')}
        title={t('HEADER_APPS')}
        subtitle={
          installed.length > 0 ? (
            <Trans
              i18nKey="MY_APPS_SUMMARY"
              values={{ running: running.length, stopped: down.length, updates: updates.length }}
              components={{ strong: <strong /> }}
            />
          ) : undefined
        }
        actions={
          <Link to="/apps/create" className="rt-btn rt-btn--primary">
            <IconPlus size={16} stroke={2} />
            {t('CUSTOM_APP_ADD_TITLE')}
          </Link>
        }
      />

      {(down.length > 0 || updates.length > 0) && (
        <section className="rt-panel rt-panel--warm rt-myapps-attention" aria-label={t('DASHBOARD_ATTENTION_TITLE')}>
          {down.length > 0 && (
            <div className="rt-myapps-attention__col">
              <h2 className="rt-display">{t('DASHBOARD_ATTENTION_TITLE')}</h2>
              <p>{t('MY_APPS_DOWN', { count: down.length })}</p>
              {down.map((app) => (
                <div key={app.info.urn} className="rt-myapps-attention__row">
                  <AppIcon name={app.info.name} urn={app.info.urn} categories={app.info.categories} size={36} />
                  <Link to={getAppPath(app.info.urn)} className="rt-myapps-attention__name">
                    {app.info.name}
                  </Link>
                  {app.app.status === 'stopped' && <StartButton app={app} />}
                </div>
              ))}
            </div>
          )}
          {updates.length > 0 && (
            <div className="rt-myapps-attention__col rt-myapps-attention__col--updates">
              <h2 className="rt-display">{t('MY_APPS_UPDATES_READY', { count: updates.length })}</h2>
              <p>{t('MY_APPS_UPDATES_BACKUP')}</p>
              <div className="rt-myapps-attention__pills">
                {updates.map((app) => (
                  <Link key={app.info.urn} to={getAppPath(app.info.urn)} className="rt-pill">
                    {app.info.name}
                  </Link>
                ))}
              </div>
              <div className="rt-myapps-attention__buttons">
                <UpdateAllButton className="rt-btn rt-btn--sm rt-btn--primary" label={t('MY_APPS_UPDATE_ALL_COUNT', { count: updates.length })} />
                <button type="button" className="rt-btn rt-btn--sm" onClick={() => setFilter('updates')}>
                  {t('MY_APPS_REVIEW_UPDATES')}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {isEmpty ? (
        <div className="rt-myapps-empty">
          <h2 className="rt-display">{t('MY_APPS_EMPTY_TITLE')}</h2>
          <p>{t('MY_APPS_EMPTY_SUBTITLE')}</p>
          <div className="rt-myapps-empty__actions">
            <Link to="/app-store" className="rt-btn rt-btn--primary">
              {t('MY_APPS_EMPTY_ACTION')}
            </Link>
            <button type="button" className="rt-btn" onClick={addLinkDisclosure.open}>
              {t('LINKS_ADD_TITLE')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="rt-myapps-filters">
            <fieldset className="rt-myapps-filters__chips">
              <legend className="rt-sr">{t('MY_APPS_FILTER_LABEL')}</legend>
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={clsx('rt-chip', { 'is-on': filter === chip.id })}
                  aria-pressed={filter === chip.id}
                  onClick={() => setFilter(chip.id)}
                >
                  {chip.label} <span className="rt-chip__count">{chip.count}</span>
                </button>
              ))}
            </fieldset>
            <span className="rt-mono rt-myapps-filters__hint">{t('MY_APPS_GROUPED_BY_CATEGORY')}</span>
          </div>

          <div className="rt-myapps-groups" data-testid="apps-list">
            {groups.map(({ category, apps }) => (
              <section key={category} className="rt-myapps-group" aria-labelledby={`group-${category}`}>
                <div className="rt-section-title">
                  <h2 id={`group-${category}`}>{category === 'other' ? t('MY_APPS_GROUP_OTHER') : t(`APP_CATEGORY_${category.toUpperCase()}`)}</h2>
                  <span className="rt-section-title__count">{padCount(apps.length)}</span>
                  <span className="rt-section-title__rule" />
                </div>
                <div className="rt-app-grid">
                  {apps.map((app) => (
                    <AppCard key={app.info.urn} app={app} updateAvailable={isUpdateAvailable(app)} />
                  ))}
                </div>
              </section>
            ))}

            {showLinks && (
              <section className="rt-myapps-group" aria-labelledby="group-links">
                <div className="rt-section-title">
                  <h2 id="group-links">{t('MY_APPS_GROUP_LINKS')}</h2>
                  <span className="rt-section-title__count">{padCount(links.length)}</span>
                  <span className="rt-section-title__rule" />
                </div>
                <div className="rt-app-grid">
                  {links.map((link) => (
                    <LinkCard key={link.id} link={link} />
                  ))}
                </div>
              </section>
            )}

            {groups.length === 0 && !showLinks && <p className="rt-myapps-none">{t('MY_APPS_FILTER_EMPTY')}</p>}
          </div>
        </>
      )}

      <AddLinkDialog isOpen={addLinkDisclosure.isOpen} onClose={addLinkDisclosure.close} />
    </>
  );
};
