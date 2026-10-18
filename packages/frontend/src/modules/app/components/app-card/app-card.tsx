import type { MyAppsDto } from '@/api-client';
import { startAppMutation } from '@/api-client/@tanstack/react-query.gen';
import { AppIcon, toIconStatus } from '@/components/app-icon/app-icon';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { DropdownMenuSeparator } from '@/components/ui/DropdownMenu/DropdownMenu';
import type { TranslatableError } from '@/types/error.types';
import {
  IconArrowUp,
  IconArrowUpRight,
  IconDotsVertical,
  IconInfoCircle,
  IconLoader2,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
  IconRotateClockwise,
  IconTrash,
} from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { AppOpenMenu, getAppPath } from '../app-open-menu/app-open-menu';
import { RestartDialog } from '../dialogs/restart-dialog/restart-dialog';
import { StopDialog } from '../dialogs/stop-dialog/stop-dialog';
import { UninstallDialog } from '../dialogs/uninstall-dialog/uninstall-dialog';
import './app-card.css';

type InstalledApp = MyAppsDto['installed'][number];

type Props = {
  app: InstalledApp;
  updateAvailable: boolean;
};

export const AppCard = ({ app, updateAvailable }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<'stop' | 'restart' | 'uninstall' | null>(null);
  const { info, app: details } = app;

  const status = details.status;
  const isRunning = status === 'running';
  const isStopped = status === 'stopped';
  const isBusy = !isRunning && !isStopped && status !== 'missing';
  const appPath = getAppPath(info.urn);

  const startMutation = useMutation({
    ...startAppMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const statusLabel = t(`APP_STATUS_${status.toUpperCase()}`);

  return (
    <article className={clsx('rt-app-card', { 'rt-app-card--off': !isRunning && !isBusy })} data-testid={`app-card-${info.id}`}>
      <div className="rt-app-card__top">
        <AppIcon name={info.name} urn={info.urn} categories={info.categories} status={toIconStatus(status)} inactive={!isRunning && !isBusy} />
        <div className="rt-app-card__text">
          <h3>
            <Link to={appPath} className="rt-app-card__name">
              {info.name}
            </Link>
          </h3>
          <span className="rt-sr">{statusLabel}</span>
          <p className="rt-app-card__desc">{isBusy ? `${statusLabel}…` : info.short_desc}</p>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rt-kebab rt-app-card__kebab" aria-label={t('MY_APPS_MORE_ACTIONS', { name: info.name })}>
              <IconDotsVertical size={17} stroke={1.8} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(appPath)}>
              <IconInfoCircle className="me-2" size={16} />
              {t('DASHBOARD_LAUNCHER_DETAILS')}
            </DropdownMenuItem>
            {updateAvailable && (
              <DropdownMenuItem onClick={() => navigate(`${appPath}/update`, { state: { from: '/apps' } })}>
                <IconArrowUp className="me-2" size={16} />
                {t('APP_ACTION_UPDATE')}
              </DropdownMenuItem>
            )}
            {isRunning && (
              <DropdownMenuItem onClick={() => setDialog('restart')}>
                <IconRotateClockwise className="me-2" size={16} />
                {t('APP_ACTION_RESTART')}
              </DropdownMenuItem>
            )}
            {(isRunning || isStopped) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDialog('uninstall')} className="text-danger">
                  <IconTrash className="me-2" size={16} />
                  {t('APP_ACTION_REMOVE')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rt-app-card__actions">
        {updateAvailable && !isBusy && (
          <button
            type="button"
            className="rt-ctl rt-ctl--update"
            onClick={() => navigate(`${appPath}/update`, { state: { from: '/apps' } })}
            aria-label={t('MY_APPS_UPDATE_APP', { name: info.name })}
            title={t('MY_APPS_UPDATE_APP', { name: info.name })}
          >
            <IconArrowUp size={16} stroke={2} />
          </button>
        )}
        {isBusy && (
          <button type="button" className="rt-ctl" disabled aria-label={statusLabel}>
            <IconLoader2 size={16} className="rt-spin" />
          </button>
        )}
        {isStopped && (
          <button
            type="button"
            className="rt-ctl rt-ctl--go"
            onClick={() => startMutation.mutate({ path: { urn: info.urn } })}
            disabled={startMutation.isPending}
            aria-label={t('MY_APPS_START_APP', { name: info.name })}
            title={t('MY_APPS_START_APP', { name: info.name })}
          >
            <IconPlayerPlayFilled size={14} />
          </button>
        )}
        {isRunning && (
          <button
            type="button"
            className="rt-ctl"
            onClick={() => setDialog('stop')}
            aria-label={t('MY_APPS_STOP_APP', { name: info.name })}
            title={t('MY_APPS_STOP_APP', { name: info.name })}
          >
            <IconPlayerStopFilled size={12} />
          </button>
        )}
        <AppOpenMenu app={app} align="end">
          <button
            type="button"
            className="rt-ctl rt-ctl--open"
            aria-label={t('MY_APPS_OPEN_APP', { name: info.name })}
            title={t('MY_APPS_OPEN_APP', { name: info.name })}
          >
            <IconArrowUpRight size={16} stroke={2} />
          </button>
        </AppOpenMenu>
      </div>

      {dialog === 'stop' && <StopDialog isOpen onClose={() => setDialog(null)} info={info} />}
      {dialog === 'restart' && <RestartDialog isOpen onClose={() => setDialog(null)} info={info} />}
      {dialog === 'uninstall' && <UninstallDialog isOpen onClose={() => setDialog(null)} info={info} />}
    </article>
  );
};
