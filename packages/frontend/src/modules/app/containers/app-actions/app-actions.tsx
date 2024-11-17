import {
  IconDownload,
  IconExternalLink,
  IconLock,
  IconLockOff,
  IconPlayerPause,
  IconPlayerPlay,
  IconRotateClockwise,
  IconSettings,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import type React from 'react';
import { Fragment } from 'react';

import { Button, type ButtonProps } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import './app-actions.css';
import { startAppMutation } from '@/api-client/@tanstack/react-query.gen';
import type { AppDetails, AppInfo, AppUpdateInfo, UserConfig } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import { InstallDialog } from '../../components/dialogs/install-dialog/install-dialog';
import { ResetDialog } from '../../components/dialogs/reset-dialog/reset-dialog';
import { RestartDialog } from '../../components/dialogs/restart-dialog/restart-dialog';
import { StopDialog } from '../../components/dialogs/stop-dialog/stop-dialog';
import { UninstallDialog } from '../../components/dialogs/uninstall-dialog/uninstall-dialog';
import { UpdateDialog } from '../../components/dialogs/update-dialog/update-dialog';
import { UpdateSettingsDialog } from '../../components/dialogs/update-settings-dialog/update-settings-dialog';
import { useAppStatus } from '../../helpers/use-app-status';
import { UpdateUserConfigDialog } from '../../components/dialogs/update-user-config-dialog/update-user-config-dialog';

interface IProps {
  app: AppDetails;
  info: AppInfo;
  updateInfo: AppUpdateInfo;
  localDomain?: string;
  userConfig: UserConfig;
}

interface BtnProps extends ButtonProps {
  IconComponent?: typeof IconDownload;
}

const ActionButton: React.FC<BtnProps> = (props) => {
  const { IconComponent, loading, title, ...rest } = props;

  const testId = loading ? 'action-button-loading' : undefined;

  return (
    <Button data-testid={testId} loading={loading} {...rest} className="action-button">
      {title}
      {IconComponent && <IconComponent className="ms-1" size={14} />}
    </Button>
  );
};

type OpenType = 'local' | 'domain' | 'local_domain';

export const AppActions = ({ app, info, localDomain, updateInfo, userConfig }: IProps) => {
  const installDisclosure = useDisclosure();
  const stopDisclosure = useDisclosure();
  const restartDisclosure = useDisclosure();
  const updateDisclosure = useDisclosure();
  const updateSettingsDisclosure = useDisclosure();
  const uninstallDisclosure = useDisclosure();
  const resetAppDisclosure = useDisclosure();
  const updateUserConfigDisclosure = useDisclosure();

  const { t } = useTranslation();
  const { setOptimisticStatus } = useAppStatus();

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const updateAvailable = Number(app.version || 0) < Number(updateInfo?.latestVersion || 0);

  const buttons: JSX.Element[] = [];

  const startMutation = useMutation({
    ...startAppMutation(),
    onError: (e: TranslatableError) => {
      toast.error(e.message, e.intlParams);
    },
    onMutate: () => {
      setOptimisticStatus('starting', app.id);
    },
  });

  const StartButton = (
    <ActionButton
      key="start"
      IconComponent={IconPlayerPlay}
      onClick={() => startMutation.mutate({ path: { id: app.id } })}
      title={t('APP_ACTION_START')}
      intent="success"
    />
  );
  const RemoveButton = (
    <ActionButton key="remove" IconComponent={IconTrash} onClick={uninstallDisclosure.open} title={t('APP_ACTION_REMOVE')} intent="danger" />
  );
  const SettingsButton = (
    <ActionButton key="settings" IconComponent={IconSettings} onClick={updateSettingsDisclosure.open} title={t('APP_ACTION_SETTINGS')} />
  );
  const StopButton = (
    <ActionButton key="stop" IconComponent={IconPlayerPause} onClick={stopDisclosure.open} title={t('APP_ACTION_STOP')} intent="danger" />
  );
  const restartButton = (
    <ActionButton key="restart" IconComponent={IconRotateClockwise} onClick={restartDisclosure.open} title={t('APP_ACTION_RESTART')} />
  );
  const LoadingButton = <ActionButton key="loading" loading intent="success" title={t('APP_ACTION_LOADING')} />;
  const CancelButton = <ActionButton key="cancel" IconComponent={IconX} onClick={stopDisclosure.open} title={t('APP_ACTION_CANCEL')} />;
  const InstallButton = <ActionButton key="install" onClick={installDisclosure.open} title={t('APP_ACTION_INSTALL')} intent="success" />;
  const UpdateButton = (
    <ActionButton key="update" IconComponent={IconDownload} onClick={updateDisclosure.open} title={t('APP_ACTION_UPDATE')} intent="success" />
  );

  const OpenButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="action-button">
          {t('APP_ACTION_OPEN')}
          <IconExternalLink className="ms-1" size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{t('APP_DETAILS_CHOOSE_OPEN_METHOD')}</DropdownMenuLabel>
        <DropdownMenuGroup>
          {app.exposed && app.domain && (
            <DropdownMenuItem onClick={() => handleOpen('domain')}>
              <IconLock className="text-green me-2" size={16} />
              {app.domain}
            </DropdownMenuItem>
          )}
          {(app.exposedLocal || !info.dynamic_config) && (
            <DropdownMenuItem onClick={() => handleOpen('local_domain')}>
              <IconLock className="text-muted me-2" size={16} />
              {app.id}.{localDomain}
            </DropdownMenuItem>
          )}
          {(app.openPort || !info.dynamic_config) && (
            <DropdownMenuItem onClick={() => handleOpen('local')}>
              <IconLockOff className="text-muted me-2" size={16} />
              {hostname}:{info.port}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  switch (app.status) {
    case 'stopped':
      buttons.push(StartButton, RemoveButton, SettingsButton);
      if (updateAvailable) {
        buttons.push(UpdateButton);
      }
      break;
    case 'running':
      buttons.push(StopButton, restartButton, SettingsButton);
      if (!info.no_gui) {
        buttons.push(OpenButton);
      }
      if (updateAvailable) {
        buttons.push(UpdateButton);
      }
      break;
    case 'installing':
    case 'uninstalling':
    case 'starting':
    case 'stopping':
    case 'restarting':
    case 'updating':
    case 'resetting':
      buttons.push(LoadingButton, CancelButton);
      break;
    case 'backing_up':
      buttons.push(LoadingButton, CancelButton);
      break;
    case 'restoring':
      buttons.push(LoadingButton, CancelButton);
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
      url = `${protocol}://${domain}:${info.port}${info.url_suffix || ''}`;
    }

    if (type === 'domain' && app.domain) {
      url = `https://${app.domain}${info.url_suffix || ''}`;
    }

    if (type === 'local_domain') {
      url = `https://${app.id}.${localDomain}`;
    }

    window.open(url, '_blank', 'noreferrer');
  };

  const openResetAppModal = () => {
    updateSettingsDisclosure.close();

    setTimeout(() => {
      resetAppDisclosure.open();
    }, 300);
  };

  const openEditUserConfig = () => {
    updateSettingsDisclosure.close();

    setTimeout(() => {
      updateUserConfigDisclosure.open();
    }, 300);
  }

  const newVersion = [updateInfo?.latestDockerVersion ? `${updateInfo?.latestDockerVersion}` : '', `(${String(updateInfo?.latestVersion)})`].join(
    ' ',
  );

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
        config={app.config ?? {}}
        onReset={openResetAppModal}
        onEditUserConfig={openEditUserConfig}
      />
      <UpdateUserConfigDialog isOpen={updateUserConfigDisclosure.isOpen} onClose={updateUserConfigDisclosure.close} info={info} userConfig={userConfig} />
      <div className="mt-1 btn-list d-flex">
        {buttons.map((button) => (
          <Fragment key={button.key}>{button}</Fragment>
        ))}
      </div>
    </>
  );
};
