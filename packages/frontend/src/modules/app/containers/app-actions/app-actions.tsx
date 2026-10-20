import {
  IconArrowUp,
  IconArrowUpRight,
  IconBan,
  IconCircleCheck,
  IconDotsVertical,
  IconDownload,
  IconEdit,
  IconEraser,
  IconLoader2,
  IconLock,
  IconLockOff,
  IconPlayerPause,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
  IconRefresh,
  IconRotateClockwise,
  IconSettings,
  IconTrash,
} from '@tabler/icons-react';
import type React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ignoreAppVersionMutation, startAppMutation, unignoreAppVersionMutation } from '@/api-client/@tanstack/react-query.gen';
import type { AppDetails, AppInfo, AppMetadata } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import { InstallDialog } from '../../components/dialogs/install-dialog/install-dialog';
import { ResetDialog } from '../../components/dialogs/reset-dialog/reset-dialog';
import { RestartDialog } from '../../components/dialogs/restart-dialog/restart-dialog';
import { StopDialog } from '../../components/dialogs/stop-dialog/stop-dialog';
import { UninstallDialog } from '../../components/dialogs/uninstall-dialog/uninstall-dialog';
import { UpdateSettingsDialog } from '../../components/dialogs/update-settings-dialog/update-settings-dialog';
import { TemplateSyncDialog } from '../../components/template-sync-dialog/template-sync-dialog';
import { useAppStatus } from '../../helpers/use-app-status';
import { DropdownMenuSeparator } from '@/components/ui/DropdownMenu/DropdownMenu';
import { useLocation, useNavigate } from 'react-router';
import './app-actions.css';

interface IProps {
  app?: AppDetails | null;
  info: AppInfo;
  metadata: AppMetadata;
  localDomain?: string;
  sslPort?: number;
  /** `store` renders the large install button of an app that is not installed yet */
  variant?: 'installed' | 'store';
}

type OpenType = 'local' | 'domain' | 'local_domain';

const BUSY_STATUSES = ['installing', 'uninstalling', 'starting', 'stopping', 'restarting', 'updating', 'resetting', 'backing_up', 'restoring'];

export const AppActions = ({ app, info, localDomain, metadata, sslPort, variant = 'installed' }: IProps) => {
  const installDisclosure = useDisclosure();
  const stopDisclosure = useDisclosure();
  const restartDisclosure = useDisclosure();
  const updateSettingsDisclosure = useDisclosure();
  const uninstallDisclosure = useDisclosure();
  const resetAppDisclosure = useDisclosure();
  const syncTemplateDisclosure = useDisclosure();

  const { t } = useTranslation();
  const { setOptimisticStatus } = useAppStatus();
  const location = useLocation();
  const navigate = useNavigate();

  const status = app?.status ?? 'missing';
  const isBusy = BUSY_STATUSES.includes(status);
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const versionIsIgnored = app?.ignoredVersion === metadata.latestVersion;
  const updateAvailable = Number(app?.version ?? 0) < Number(metadata?.latestVersion || 0);
  const showUpdate = updateAvailable && !versionIsIgnored && (status === 'running' || status === 'stopped');

  const appLocalDomain = `${metadata.localSubdomain}.${localDomain}${sslPort !== 443 ? `:${sslPort}` : ''}`;

  const startMutation = useMutation({
    ...startAppMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onMutate: () => {
      setOptimisticStatus('starting', info.urn);
    },
  });

  const ignoreVersionMutation = useMutation({
    ...ignoreAppVersionMutation(),
    onSuccess: () => {
      toast.success(t('APP_ACTION_IGNORE_VERSION_SUCCESS'));
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  const unignoreVersionMutation = useMutation({
    ...unignoreAppVersionMutation(),
    onSuccess: () => {
      toast.success(t('APP_ACTION_UNIGNORE_VERSION_SUCCESS'));
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  const goToUpdate = () => navigate(`${location.pathname}/update`, { state: { from: location.pathname } });

  const RemoveListItem = (
    <DropdownMenuItem onClick={uninstallDisclosure.open} key="remove" className="text-danger">
      <IconTrash className="me-2" size={16} />
      {t('APP_ACTION_REMOVE')}
    </DropdownMenuItem>
  );
  const SettingsListItem = (
    <DropdownMenuItem onClick={updateSettingsDisclosure.open} key="settings">
      <IconSettings className="me-2" size={16} />
      {t('APP_ACTION_SETTINGS')}
    </DropdownMenuItem>
  );
  const RestartListItem = (
    <DropdownMenuItem onClick={restartDisclosure.open} key="restart">
      <IconRotateClockwise className="me-2" size={16} />
      {t('APP_ACTION_RESTART')}
      {app?.pendingRestart && <span className="rt-appd-menu-dot" title={t('MY_APPS_PENDING_RESTART')} />}
    </DropdownMenuItem>
  );
  const UpdateListItem = (
    <DropdownMenuItem onClick={goToUpdate} key="update">
      <IconDownload className="me-2" size={16} />
      {t('APP_ACTION_UPDATE')}
      <span className="rt-appd-menu-dot" title={t('MY_APPS_UPDATE_AVAILABLE')} />
    </DropdownMenuItem>
  );
  const IgnoreVersionListItem = (
    <DropdownMenuItem
      onClick={() => ignoreVersionMutation.mutate({ path: { urn: info.urn } })}
      key="ignore-version"
      disabled={ignoreVersionMutation.isPending}
    >
      <IconBan className="me-2" size={16} />
      {t('APP_ACTION_IGNORE_VERSION')}
    </DropdownMenuItem>
  );
  const UnignoreVersionListItem = (
    <DropdownMenuItem
      onClick={() => unignoreVersionMutation.mutate({ path: { urn: info.urn } })}
      key="unignore-version"
      disabled={unignoreVersionMutation.isPending}
    >
      <IconCircleCheck className="me-2" size={16} />
      {t('APP_ACTION_UNIGNORE_VERSION')}
    </DropdownMenuItem>
  );
  const CancelListItem = (
    <DropdownMenuItem onClick={stopDisclosure.open} key="cancel">
      <IconPlayerPause className="me-2" size={16} />
      {t('APP_ACTION_CANCEL')}
    </DropdownMenuItem>
  );
  const ResetListItem = (
    <DropdownMenuItem onClick={resetAppDisclosure.open} key="reset" className="text-danger">
      <IconEraser className="me-2" size={16} />
      {t('APP_INSTALL_FORM_RESET')}
    </DropdownMenuItem>
  );

  const storeId = info.urn.split(':')[1];
  const isCustomApp = storeId === '_user';
  const editPath = isCustomApp ? `/apps/${info.id}/edit` : `/apps/${storeId}/${info.id}/edit`;

  const EditConfigListItem = (
    <DropdownMenuItem onClick={() => navigate(editPath)} key="edit-config" disabled={status !== 'stopped' && status !== 'missing'}>
      <IconEdit className="me-2" size={16} />
      {t('APP_EDIT_CONFIG')}
    </DropdownMenuItem>
  );

  const SyncTemplateListItem = (
    <DropdownMenuItem onClick={syncTemplateDisclosure.open} key="sync-template">
      <IconRefresh className="me-2" size={16} />
      {t('APP_SYNC_WITH_TEMPLATE')}
    </DropdownMenuItem>
  );

  const listItems: React.JSX.Element[] = [];
  const listItemsAdvanced: React.JSX.Element[] = [];
  const listItemsDestructive: React.JSX.Element[] = [];

  if (status === 'running' || status === 'stopped') {
    listItems.push(SettingsListItem);
    if (status === 'running') listItems.push(RestartListItem);
    if (updateAvailable && !versionIsIgnored) {
      listItems.push(UpdateListItem);
      listItems.push(IgnoreVersionListItem);
    } else if (versionIsIgnored) {
      listItems.push(UnignoreVersionListItem);
    }
    listItemsAdvanced.push(EditConfigListItem);
    if (app && (app.templateUrn || !isCustomApp)) {
      listItemsAdvanced.push(SyncTemplateListItem);
    }
    listItemsDestructive.push(ResetListItem);
    listItemsDestructive.push(RemoveListItem);
  } else if (isBusy) {
    // Updates and backups are cancelled from their job progress card
    if (status !== 'updating' && status !== 'backing_up') listItems.push(CancelListItem);
  } else if (status === 'missing' && isCustomApp) {
    listItemsDestructive.push(RemoveListItem);
  }

  const canOpen = status === 'running' && !info.no_gui && (app?.exposedLocal || app?.openPort || app?.exposed);

  const handleOpen = (type: OpenType) => {
    let url = '';
    const { https } = info;
    const protocol = https ? 'https' : 'http';

    if (typeof window !== 'undefined') {
      // Current domain
      const domain = window.location.hostname;
      url = `${protocol}://${domain}:${app?.port ?? info.port}${info.url_suffix || ''}`;
    }

    if (type === 'domain' && app?.domain) {
      url = `https://${app.domain}${sslPort !== 443 ? `:${sslPort}` : ''}${info.url_suffix || ''}`;
    }

    if (type === 'local_domain') {
      url = `https://${appLocalDomain}${info.url_suffix || ''}`;
    }

    window.open(url, '_blank', 'noreferrer');
  };

  const dialogs = (
    <>
      <InstallDialog isOpen={installDisclosure.isOpen} onClose={installDisclosure.close} info={info} />
      <StopDialog isOpen={stopDisclosure.isOpen} onClose={stopDisclosure.close} info={info} />
      <RestartDialog isOpen={restartDisclosure.isOpen} onClose={restartDisclosure.close} info={info} />
      <UninstallDialog isOpen={uninstallDisclosure.isOpen} onClose={uninstallDisclosure.close} info={info} />
      <ResetDialog isOpen={resetAppDisclosure.isOpen} onClose={resetAppDisclosure.close} info={info} />
      <UpdateSettingsDialog
        isOpen={updateSettingsDisclosure.isOpen}
        onClose={updateSettingsDisclosure.close}
        info={info}
        config={app?.config ?? {}}
      />
      <TemplateSyncDialog appUrn={info.urn} isOpen={syncTemplateDisclosure.isOpen} onClose={syncTemplateDisclosure.close} />
    </>
  );

  if (variant === 'store') {
    const installing = status === 'installing';

    return (
      <div className="rt-appd-install">
        {dialogs}
        {installing ? (
          <>
            <button type="button" className="rt-btn rt-btn--lg rt-appd-install__busy" onClick={stopDisclosure.open} aria-live="polite">
              {t('APP_PAGE_INSTALLING')}
              <span className="rt-appd-install__cancel">{t('APP_ACTION_CANCEL')}</span>
            </button>
            <div className="rt-appd-bar" aria-hidden="true">
              <span />
            </div>
            <span className="rt-appd-install__hint rt-mono">{t('APP_PAGE_INSTALLING_HINT')}</span>
          </>
        ) : (
          <>
            <button type="button" className="rt-btn rt-btn--primary rt-btn--lg" onClick={installDisclosure.open}>
              <IconDownload size={17} stroke={2.2} />
              {t('APP_ACTION_INSTALL')}
            </button>
            <span className="rt-appd-install__hint">
              {info.port ? t('APP_PAGE_INSTALL_HINT_PORT', { port: info.port }) : t('APP_PAGE_INSTALL_HINT')}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rt-appd-actions">
      {dialogs}
      {canOpen && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rt-btn rt-btn--primary">
              {t('APP_ACTION_OPEN')}
              <IconArrowUpRight size={15} stroke={2.2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {app?.exposed && app.domain && (
                <DropdownMenuItem onClick={() => handleOpen('domain')}>
                  <IconLock className="text-green me-2" size={16} />
                  {app.domain}
                  {sslPort !== 443 ? `:${sslPort}` : ''}
                </DropdownMenuItem>
              )}
              {app?.exposedLocal && (
                <DropdownMenuItem onClick={() => handleOpen('local_domain')}>
                  <IconLock className="text-muted me-2" size={16} />
                  {appLocalDomain}
                </DropdownMenuItem>
              )}
              {(app?.openPort || !info.dynamic_config) && (
                <DropdownMenuItem onClick={() => handleOpen('local')}>
                  <IconLockOff className="text-muted me-2" size={16} />
                  {hostname}:{app?.port ?? info.port}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {status === 'missing' && (
        <button type="button" className="rt-btn rt-btn--primary" onClick={installDisclosure.open}>
          {t('APP_ACTION_INSTALL')}
        </button>
      )}
      {showUpdate && (
        <button
          type="button"
          className="rt-appd-btn rt-appd-btn--update"
          onClick={goToUpdate}
          aria-label={t('MY_APPS_UPDATE_APP', { name: info.name })}
          title={t('MY_APPS_UPDATE_AVAILABLE')}
        >
          <IconArrowUp size={16} stroke={2.2} />
        </button>
      )}
      {status === 'running' && (
        <button type="button" className="rt-appd-btn" onClick={stopDisclosure.open} aria-label={t('MY_APPS_STOP_APP', { name: info.name })}>
          <IconPlayerStopFilled size={14} />
        </button>
      )}
      {status === 'stopped' && (
        <button
          type="button"
          className="rt-appd-btn rt-appd-btn--go"
          onClick={() => startMutation.mutate({ path: { urn: info.urn } })}
          aria-label={t('MY_APPS_START_APP', { name: info.name })}
        >
          <IconPlayerPlayFilled size={14} />
        </button>
      )}
      {isBusy && (
        <button type="button" className="rt-appd-btn" disabled aria-label={t('APP_ACTION_LOADING')}>
          <IconLoader2 size={17} className="rt-spin" />
        </button>
      )}
      {listItems.length + listItemsDestructive.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" name="more" className="rt-appd-btn" aria-label={t('MY_APPS_MORE_ACTIONS', { name: info.name })}>
              <IconDotsVertical size={17} />
              {((updateAvailable && !versionIsIgnored) || app?.pendingRestart) && <span className="rt-appd-pip" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>{listItems}</DropdownMenuGroup>
            {listItemsAdvanced.length > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuGroup>{listItemsAdvanced}</DropdownMenuGroup>
            {listItemsDestructive.length > 0 && listItems.length > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuGroup>{listItemsDestructive}</DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
