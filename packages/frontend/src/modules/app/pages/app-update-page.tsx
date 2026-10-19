import { getApp } from '@/api-client';
import {
  getAppBackupsOptions,
  getAppComposeDiffOptions,
  getAppConfigDiffOptions,
  getAppOptions,
  updateAppMutation,
} from '@/api-client/@tanstack/react-query.gen';
import { AppIcon } from '@/components/app-icon/app-icon';
import type { RouteHandle } from '@/components/layouts/dashboard/layout';
import { useAppContext } from '@/context/app-context';
import { useSSE } from '@/lib/hooks/use-sse';
import { formatBytes } from '@/modules/dashboard/helpers/format';
import { RtSwitch } from '@/modules/settings/components/settings-ui/settings-ui';
import type { TranslatableError } from '@/types/error.types';
import { IconAlertTriangle, IconArchive, IconArrowLeft, IconArrowRight, IconArrowUp, IconArrowUpRight, IconCheck } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, redirect, useLocation, useParams } from 'react-router';
import yaml from 'yaml';
import { formatShortDate, getPreferredAddress } from '../components/app-details-view/app-format';
import { getAppPath } from '../components/app-open-menu/app-open-menu';
import { DiffView, countLineChanges } from '../components/app-update/diff-view';
import type { Route } from './+types/app-update-page';
import '../components/app-details-view/app-details-view.css';
import './app-update-page.css';

export const handle: RouteHandle = { ownHeader: true };

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  if (!params.appId || !params.storeId) {
    return redirect('/apps');
  }

  const appOptions = await getApp({ path: { urn: `${params.appId}:${params.storeId}` } });

  if (!appOptions.data) {
    return redirect('/apps');
  }

  return appOptions.data;
}

type StepId = 'info' | 'config' | 'compose' | 'backup';
type Phase = { kind: 'wizard' } | { kind: 'running'; backup: boolean } | { kind: 'done'; backup: boolean } | { kind: 'failed'; error?: string };

const composeToYaml = (json?: string | null) => {
  try {
    return yaml.stringify(JSON.parse(json ?? '{}'), { nullStr: '' }) ?? '';
  } catch {
    return json ?? '';
  }
};

export default function AppUpdatePage({ loaderData }: Route.ComponentProps) {
  const params = useParams<{ storeId: string; appId: string }>();
  const { t } = useTranslation();
  const location = useLocation();
  const { userSettings } = useAppContext();

  const { data: appData } = useQuery({
    ...getAppOptions({ path: { urn: `${params.appId}:${params.storeId}` } }),
    initialData: loaderData,
  });

  const { info, app, metadata } = appData;
  const appPath: string = location.state?.from || getAppPath(info.urn);

  const [step, setStep] = useState(0);
  const [backupApp, setBackupApp] = useState(true);
  const [phase, setPhase] = useState<Phase>({ kind: 'wizard' });
  // Versions are kept from the start, the app data changes once the update is done
  const [versions] = useState({
    from: info.version,
    to: metadata.latestDockerVersion || String(metadata.latestVersion),
    buildFrom: app?.version,
    buildTo: metadata.latestVersion,
  });

  const configDiff = useQuery({ ...getAppConfigDiffOptions({ path: { urn: info.urn } }) });
  const composeDiff = useQuery({ ...getAppComposeDiffOptions({ path: { urn: info.urn } }) });
  const backups = useQuery({ ...getAppBackupsOptions({ path: { urn: info.urn }, query: { page: 1, pageSize: 1 } }) });
  const lastBackup = backups.data?.data[0];

  const config = { before: configDiff.data?.current ?? '', after: configDiff.data?.new ?? '' };
  const compose = { before: composeToYaml(composeDiff.data?.current), after: composeToYaml(composeDiff.data?.new) };
  const composeChanged = Boolean(composeDiff.data) && composeDiff.data?.new !== composeDiff.data?.current;
  const configCounts = useMemo(() => countLineChanges(config.before, config.after), [config.before, config.after]);
  const composeCounts = useMemo(() => countLineChanges(compose.before, compose.after), [compose.before, compose.after]);

  const steps: { id: StepId; label: string; sub: string }[] = [
    { id: 'info', label: t('APP_UPDATE_INFORMATION_TITLE'), sub: t('APP_UPDATE_WHAT_CHANGES') },
    { id: 'config', label: t('APP_UPDATE_CONFIGURATION_TITLE'), sub: 'config.json' },
    ...(composeChanged ? [{ id: 'compose' as const, label: t('APP_UPDATE_COMPOSE_TITLE'), sub: 'docker-compose.yml' }] : []),
    { id: 'backup', label: t('APP_UPDATE_BACKUP_TITLE'), sub: t('APP_UPDATE_BEFORE_UPDATING') },
  ];
  const current = steps[Math.min(step, steps.length - 1)] ?? steps[0];
  const isLast = step >= steps.length - 1;
  const leads: Record<StepId, string> = {
    info: t('APP_UPDATE_INFO_LEAD'),
    config: t('APP_UPDATE_CONFIG_LEAD'),
    compose: t('APP_UPDATE_COMPOSE_LEAD'),
    backup: t('APP_UPDATE_BACKUP_LEAD'),
  };

  // The update runs in the worker, its outcome comes back as an app event
  useSSE({
    topic: 'app',
    onEvent: ({ event, appUrn, error }) => {
      if (appUrn !== info.urn) return;
      if (event === 'update_success') setPhase((p) => (p.kind === 'running' ? { kind: 'done', backup: p.backup } : p));
      if (event === 'update_error') setPhase((p) => (p.kind === 'running' ? { kind: 'failed', error } : p));
    },
  });

  const update = useMutation({
    ...updateAppMutation(),
    onMutate: (variables) => setPhase({ kind: 'running', backup: Boolean(variables.body?.performBackup) }),
    onError: (e: TranslatableError) => setPhase({ kind: 'failed', error: t(e.message, e.intlParams) }),
  });

  const address = getPreferredAddress(info, app, metadata, userSettings);
  const githubReleases = info.source?.includes('github.com') ? `${info.source.replace(/\/$/, '')}/releases` : undefined;

  return (
    <div className="rt-upd" data-testid="app-update">
      <nav aria-label={t('APP_PAGE_BREADCRUMB')} className="rt-appd-crumbs rt-mono">
        <Link to="/apps">{t('HEADER_APPS')}</Link>
        <span aria-hidden="true">/</span>
        <Link to={appPath}>{info.name}</Link>
        <span aria-hidden="true">/</span>
        <span className="rt-appd-crumbs__current" aria-current="page">
          {t('APP_UPDATE_BREADCRUMB')}
        </span>
      </nav>

      <header className="rt-upd__head">
        <AppIcon name={info.name} urn={info.urn} categories={info.categories} size={72} className="rt-upd__icon" />
        <div className="rt-upd__title">
          <h1>{t('APP_UPDATE_FORM_TITLE', { name: info.name })}</h1>
          <div className="rt-upd__versions" role="img" aria-label={t('APP_UPDATE_VERSION_CHANGE', { from: versions.from, to: versions.to })}>
            <span className="rt-upd__ver rt-upd__ver--old">{versions.from}</span>
            <IconArrowRight size={16} stroke={2} aria-hidden="true" />
            <span className="rt-upd__ver rt-upd__ver--new">{versions.to}</span>
          </div>
        </div>
        {phase.kind === 'wizard' && (
          <Link to={appPath} className="rt-btn rt-btn--ghost">
            {t('APP_ACTION_CANCEL')}
          </Link>
        )}
      </header>

      {phase.kind === 'wizard' && current && (
        <div className="rt-upd__wizard">
          <ol className="rt-upd__steps" aria-label={t('APP_UPDATE_STEPS')}>
            {steps.map((s, index) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={clsx('rt-upd-step', { 'is-current': index === step, 'is-done': index < step })}
                  aria-current={index === step ? 'step' : undefined}
                  onClick={() => setStep(index)}
                >
                  <span className="rt-upd-step__dot">{index < step ? <IconCheck size={14} stroke={2.4} /> : index + 1}</span>
                  <span>
                    <span>{s.label}</span>
                    <span className="rt-upd-step__sub">{s.sub}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <section className="rt-panel rt-upd__panel" aria-labelledby="rt-upd-step-title">
            <div className="rt-upd__panel-head">
              <div className="rt-eyebrow rt-mono">{t('APP_UPDATE_STEP_OF', { current: step + 1, total: steps.length })}</div>
              <h2 id="rt-upd-step-title">{current.label}</h2>
              <p>{leads[current.id]}</p>
            </div>

            <div className="rt-upd__panel-body">
              {current.id === 'info' && (
                <div className="rt-upd__info">
                  <div className="rt-upd__facts">
                    <div className="rt-upd-fact">
                      <span className="rt-upd-fact__k">{t('APP_DETAILS_VERSION')}</span>
                      <span className="rt-upd-fact__v rt-mono">
                        {versions.from} → <span className="rt-upd__new">{versions.to}</span>
                      </span>
                    </div>
                    {versions.buildFrom !== undefined && (
                      <div className="rt-upd-fact">
                        <span className="rt-upd-fact__k">{t('APP_UPDATE_FACT_BUILD')}</span>
                        <span className="rt-upd-fact__v rt-mono">
                          {versions.buildFrom} → <span className="rt-upd__new">{versions.buildTo}</span>
                        </span>
                      </div>
                    )}
                    <div className="rt-upd-fact">
                      <span className="rt-upd-fact__k">{t('APP_PAGE_LAST_BACKUP')}</span>
                      <span className="rt-upd-fact__v">
                        {lastBackup ? formatShortDate(lastBackup.date, userSettings.timeZone) : t('APP_PAGE_NO_BACKUP')}
                      </span>
                    </div>
                  </div>
                  <div className="rt-upd__changes">
                    <div className="rt-upd__changes-title">{t('APP_UPDATE_WHAT_CHANGES')}</div>
                    {[
                      { id: 'config' as const, file: 'config.json', counts: configCounts },
                      ...(composeChanged ? [{ id: 'compose' as const, file: 'docker-compose.yml', counts: composeCounts }] : []),
                    ].map((row) => (
                      <button key={row.id} type="button" className="rt-upd__change" onClick={() => setStep(steps.findIndex((s) => s.id === row.id))}>
                        <span className="rt-mono">{row.file}</span>
                        <span className="rt-mono rt-diff__counts">
                          <span className="rt-diff__add">+{row.counts.added}</span> <span className="rt-diff__del">−{row.counts.removed}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  {githubReleases && (
                    <a className="rt-upd__link" href={githubReleases} target="_blank" rel="noreferrer">
                      {t('APP_UPDATE_RELEASES', { name: info.name })} ↗
                    </a>
                  )}
                </div>
              )}

              {current.id === 'config' && <DiffView fileName="config.json" before={config.before} after={config.after} />}
              {current.id === 'compose' && <DiffView fileName="docker-compose.yml" before={compose.before} after={compose.after} />}

              {current.id === 'backup' && (
                <div className="rt-upd__backup">
                  <div className="rt-upd__backup-card">
                    <span className="rt-upd__backup-icon" aria-hidden="true">
                      <IconArchive size={19} stroke={1.8} />
                    </span>
                    <div className="rt-upd__backup-text">
                      <div className="rt-upd__backup-title">
                        {t('APP_UPDATE_BACKUP_TOGGLE')}
                        <span className="rt-upd__badge rt-mono">{t('APP_UPDATE_RECOMMENDED')}</span>
                      </div>
                      <div className="rt-upd__backup-hint">
                        {lastBackup ? t('APP_UPDATE_BACKUP_HINT_SIZE', { size: formatBytes(lastBackup.size) }) : t('APP_UPDATE_BACKUP_HINT')}
                      </div>
                    </div>
                    <RtSwitch checked={backupApp} onChange={setBackupApp} label={t('APP_UPDATE_BACKUP_TOGGLE')} />
                  </div>
                  {!backupApp && (
                    <div className="rt-upd__warning" role="alert">
                      <IconAlertTriangle size={18} stroke={1.8} aria-hidden="true" />
                      <span>
                        {t('APP_UPDATE_NO_BACKUP_WARNING')}{' '}
                        {lastBackup && t('APP_UPDATE_NO_BACKUP_LAST', { date: formatShortDate(lastBackup.date, userSettings.timeZone) })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rt-upd__panel-foot">
              {step > 0 && (
                <button type="button" className="rt-btn" onClick={() => setStep(step - 1)}>
                  <IconArrowLeft size={14} stroke={2.2} />
                  {t('APP_UPDATE_FORM_BACK')}
                </button>
              )}
              <span className="rt-upd__spacer" />
              {isLast ? (
                <button
                  type="button"
                  className="rt-btn rt-btn--primary"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ path: { urn: info.urn }, body: { performBackup: backupApp } })}
                >
                  <IconArrowUp size={15} stroke={2.2} />
                  {t('APP_UPDATE_SUBMIT_TO', { version: versions.to })}
                </button>
              ) : (
                <button type="button" className="rt-btn rt-btn--primary" onClick={() => setStep(step + 1)}>
                  {step === 0 ? t('APP_UPDATE_REVIEW') : t('APP_UPDATE_FORM_NEXT')}
                  <IconArrowRight size={14} stroke={2.2} />
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {phase.kind !== 'wizard' && (
        <section className="rt-panel rt-upd__run" aria-live="polite" aria-labelledby="rt-upd-run-title">
          {phase.kind === 'running' && (
            <>
              <h2 id="rt-upd-run-title">{t('APP_UPDATE_RUNNING_TITLE', { name: info.name })}</h2>
              <p className="rt-upd__run-lead">{t('APP_UPDATE_RUNNING_LEAD')}</p>
              <div className="rt-upd-task">
                <span className="rt-upd-task__icon rt-upd-task__icon--run" aria-hidden="true" />
                <span className="rt-upd-task__label">{phase.backup ? t('APP_UPDATE_RUNNING_BACKUP') : t('APP_UPDATE_RUNNING_NO_BACKUP')}</span>
                <span className="rt-upd-task__note rt-mono">{t('APP_UPDATE_RUNNING_NOTE')}</span>
              </div>
            </>
          )}

          {phase.kind === 'done' && (
            <>
              <span className="rt-upd__done-badge" aria-hidden="true">
                <IconCheck size={26} stroke={2.4} />
              </span>
              <h2 id="rt-upd-run-title">{t('APP_UPDATE_DONE_TITLE', { name: info.name, version: versions.to })}</h2>
              <p className="rt-upd__run-lead">{app?.status === 'running' ? t('APP_UPDATE_DONE_RUNNING') : t('APP_UPDATE_DONE_STOPPED')}</p>
              {[
                phase.backup ? t('APP_UPDATE_TASK_BACKUP') : t('APP_UPDATE_TASK_BACKUP_SKIPPED'),
                t('APP_UPDATE_TASK_PULL'),
                ...(app?.status === 'running' ? [t('APP_UPDATE_TASK_RESTART', { name: info.name })] : []),
              ].map((label, index) => (
                <div key={label} className="rt-upd-task">
                  <span
                    className={clsx('rt-upd-task__icon', index === 0 && !phase.backup ? 'rt-upd-task__icon--skip' : 'rt-upd-task__icon--ok')}
                    aria-hidden="true"
                  >
                    {index === 0 && !phase.backup ? '–' : <IconCheck size={14} stroke={2.4} />}
                  </span>
                  <span className="rt-upd-task__label">{label}</span>
                </div>
              ))}
              <div className="rt-upd__run-actions">
                {app?.status === 'running' && address && (
                  <a className="rt-btn rt-btn--primary" href={address.url} target="_blank" rel="noreferrer">
                    {t('MY_APPS_OPEN_APP', { name: info.name })}
                    <IconArrowUpRight size={14} stroke={2.2} />
                  </a>
                )}
                <Link to={appPath} className="rt-btn">
                  {t('APP_UPDATE_BACK_TO_APP')}
                </Link>
              </div>
            </>
          )}

          {phase.kind === 'failed' && (
            <>
              <span className="rt-upd__failed-badge" aria-hidden="true">
                <IconAlertTriangle size={26} stroke={2} />
              </span>
              <h2 id="rt-upd-run-title">{t('APP_UPDATE_FAILED_TITLE')}</h2>
              <p className="rt-upd__run-lead">{t('APP_UPDATE_FAILED_LEAD', { name: info.name })}</p>
              {phase.error && <pre className="rt-upd__error">{phase.error}</pre>}
              <div className="rt-upd__run-actions">
                <Link to={`${appPath}?tab=logs`} className="rt-btn rt-btn--primary">
                  {t('APP_UPDATE_VIEW_LOGS')}
                </Link>
                <Link to={`${appPath}?tab=backups`} className="rt-btn">
                  {t('APP_BACKUPS_TAB_TITLE')}
                </Link>
                <Link to={appPath} className="rt-btn">
                  {t('APP_UPDATE_BACK_TO_APP')}
                </Link>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
