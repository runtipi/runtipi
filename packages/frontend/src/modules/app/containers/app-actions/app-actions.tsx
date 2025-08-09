import {
  IconDots,
  IconDownload,
  IconEraser,
  IconExternalLink,
  IconLock,
  IconLockOff,
  IconPlayerPause,
  IconPlayerPlay,
  IconRotateClockwise,
  IconSettings,
  IconTrash,
} from '@tabler/icons-react';
import type React from 'react';
import { createElement } from 'react';
import { Button, type ButtonProps } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import './app-actions.css';
import { startAppMutation } from '@/api-client/@tanstack/react-query.gen';
import type { AppDetails, AppInfo, AppMetadata } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { InstallDialog } from '../../components/dialogs/install-dialog/install-dialog';
import { ResetDialog } from '../../components/dialogs/reset-dialog/reset-dialog';
import { RestartDialog } from '../../components/dialogs/restart-dialog/restart-dialog';
import { StopDialog } from '../../components/dialogs/stop-dialog/stop-dialog';
import { UninstallDialog } from '../../components/dialogs/uninstall-dialog/uninstall-dialog';
import { UpdateDialog } from '../../components/dialogs/update-dialog/update-dialog';
import { UpdateSettingsDialog } from '../../components/dialogs/update-settings-dialog/update-settings-dialog';
import { useAppStatus } from '../../helpers/use-app-status';
import { Tooltip } from 'react-tooltip';
import { DropdownMenuSeparator } from '@/components/ui/DropdownMenu/DropdownMenu';

interface IProps {
  app?: AppDetails | null;
  info: AppInfo;
  metadata: AppMetadata;
  localDomain?: string;
  sslPort?: number;
}

interface BtnProps extends ButtonProps {
  IconComponent?: typeof IconDownload;
}

const ActionButton: React.FC<BtnProps> = (props) => {
  const { IconComponent, loading, title, className, ...rest } = props;

  const testId = loading ? 'action-button-loading' : undefined;

  return (
    <Button data-testid={testId} loading={loading} {...rest} className={clsx('action-button', className)}>
      {title}
      {IconComponent && <IconComponent className="ms-1" size={14} />}
    </Button>
  );
};

type OpenType = 'local' | 'domain' | 'local_domain';

export const AppActions = ({ app, info, localDomain, metadata, sslPort }: IProps) => {
  const installDisclosure = useDisclosure();
  const stopDisclosure = useDisclosure();
  const restartDisclosure = useDisclosure();
  const updateDisclosure = useDisclosure();
  const updateSettingsDisclosure = useDisclosure();
  const uninstallDisclosure = useDisclosure();
  const resetAppDisclosure = useDisclosure();

  const { t } = useTranslation();
  const { setOptimisticStatus } = useAppStatus();

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const updateAvailable = Number(app?.version ?? 0) < Number(metadata?.latestVersion || 0);

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

  const StartButton = (
    <ActionButton
      key="start"
      IconComponent={IconPlayerPlay}
      onClick={() => startMutation.mutate({ path: { urn: info.urn } })}
      title={t('APP_ACTION_START')}
      intent="success"
    />
  );
  const LoadingButton = <ActionButton key="loading" loading intent="success" title={t('APP_ACTION_LOADING')} />;

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
      {app?.pendingRestart && <span className="badge badge-warning ms-2">{t('MY_APPS_PENDING_RESTART')}</span>}
    </DropdownMenuItem>
  );
  const UpdateListItem = (
    <DropdownMenuItem onClick={updateDisclosure.open} key="update">
      <IconDownload className="me-2" size={16} />
      <div>
        {t('APP_ACTION_UPDATE')}
        <span className="ms-2 badge bg-red" />
      </div>
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

  const StopButton = (
    <ActionButton key="stop" IconComponent={IconPlayerPause} onClick={stopDisclosure.open} title={t('APP_ACTION_STOP')} intent="default" />
  );
  const InstallButton = <ActionButton key="install" onClick={installDisclosure.open} title={t('APP_ACTION_INSTALL')} intent="success" />;

  const OpenButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="action-button">
          {t('APP_ACTION_OPEN')}
          <IconExternalLink className="ms-1" size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          {app?.exposed && app.domain && (
            <DropdownMenuItem onClick={() => handleOpen('domain')}>
              <IconLock className="text-green me-2" size={16} />
              {app.domain}
              {sslPort !== 443 ? `:${sslPort}` : ''}
            </DropdownMenuItem>
          )}
          {(app?.exposedLocal || !info.dynamic_config) && (
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
  );

  const buttons: React.JSX.Element[] = [];
  const listItems: React.JSX.Element[] = [];
  const listItemsDestructive: React.JSX.Element[] = [];

  switch (app?.status ?? 'missing') {
    case 'stopped':
      buttons.push(StartButton);
      listItems.push(SettingsListItem);
      listItemsDestructive.push(ResetListItem);
      listItemsDestructive.push(RemoveListItem);
      if (updateAvailable) {
        listItems.push(UpdateListItem);
      }
      break;
    case 'running':
      buttons.push(StopButton);
      listItems.push(SettingsListItem);
      listItems.push(RestartListItem);
      listItemsDestructive.push(ResetListItem);
      listItemsDestructive.push(RemoveListItem);

      if (!info.no_gui && (app?.exposedLocal || app?.openPort || app?.exposed)) {
        buttons.push(OpenButton);
      }

      if (updateAvailable) {
        listItems.push(UpdateListItem);
      }
      break;
    case 'installing':
    case 'uninstalling':
    case 'starting':
    case 'stopping':
    case 'restarting':
    case 'updating':
    case 'resetting':
    case 'backing_up':
    case 'restoring':
      buttons.push(LoadingButton);
      listItems.push(CancelListItem);
      break;
    case 'missing':
      buttons.push(InstallButton);
      break;
    default:
      break;
  }

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

  const newVersion = [metadata?.latestDockerVersion ? `${metadata?.latestDockerVersion}` : '', `(${String(metadata?.latestVersion)})`].join(' ');

  return (
    <>
      <InstallDialog isOpen={installDisclosure.isOpen} onClose={installDisclosure.close} info={info} />
      <StopDialog isOpen={stopDisclosure.isOpen} onClose={stopDisclosure.close} info={info} />
      <RestartDialog isOpen={restartDisclosure.isOpen} onClose={restartDisclosure.close} info={info} />
      <UninstallDialog isOpen={uninstallDisclosure.isOpen} onClose={uninstallDisclosure.close} info={info} />
      <UpdateDialog isOpen={updateDisclosure.isOpen} onClose={updateDisclosure.close} info={info} newVersion={newVersion} />
      <ResetDialog isOpen={resetAppDisclosure.isOpen} onClose={resetAppDisclosure.close} info={info} />
      <UpdateSettingsDialog
        isOpen={updateSettingsDisclosure.isOpen}
        onClose={updateSettingsDisclosure.close}
        info={info}
        config={app?.config ?? {}}
      />
      <div className="mt-1 btn-list d-flex">
        {buttons.map((button) => {
          return createElement(button.type, {
            ...button.props,
            key: button.key,
          });
        })}
        {listItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button name="more" className="w-100">
                <IconDots size={14} />
                <Tooltip className="tooltip" anchorSelect=".updateAvailable">
                  {t('MY_APPS_UPDATE_AVAILABLE')}
                </Tooltip>
                {updateAvailable && <span className="updateAvailable badge badge-dot bg-red badge-notification" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>{listItems}</DropdownMenuGroup>
              {listItemsDestructive.length > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuGroup>{listItemsDestructive}</DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </>
  );
};
