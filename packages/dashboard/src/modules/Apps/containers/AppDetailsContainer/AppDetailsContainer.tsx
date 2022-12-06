import React from 'react';
import { useDisclosure } from '../../../../hooks/useDisclosure';
import { useToastStore } from '../../../../state/toastStore';
import { AppLogo } from '../../../../components/AppLogo/AppLogo';
import { AppStatus } from '../../../../components/AppStatus';
import {
  App,
  AppInfo,
  AppStatusEnum,
  GetAppDocument,
  InstalledAppsDocument,
  useInstallAppMutation,
  useStartAppMutation,
  useStopAppMutation,
  useUninstallAppMutation,
  useUpdateAppConfigMutation,
  useUpdateAppMutation,
} from '../../../../generated/graphql';
import AppActions from '../../components/AppActions';
import AppDetailsTabs from '../../components/AppDetailsTabs';
import { FormValues } from '../../components/InstallForm';
import InstallModal from '../../components/InstallModal';
import StopModal from '../../components/StopModal';
import UninstallModal from '../../components/UninstallModal';
import UpdateModal from '../../components/UpdateModal';
import UpdateSettingsModal from '../../components/UpdateSettingsModal';

interface IProps {
  app: Pick<App, 'id' | 'updateInfo' | 'config' | 'exposed' | 'domain' | 'status'>;
  info: AppInfo;
}

const AppDetailsContainer: React.FC<IProps> = ({ app, info }) => {
  const { addToast } = useToastStore();
  const installDisclosure = useDisclosure();
  const uninstallDisclosure = useDisclosure();
  const stopDisclosure = useDisclosure();
  const updateDisclosure = useDisclosure();
  const updateSettingsDisclosure = useDisclosure();

  // Mutations
  const [install] = useInstallAppMutation({ refetchQueries: [{ query: GetAppDocument, variables: { appId: info.id } }, { query: InstalledAppsDocument }] });
  const [update] = useUpdateAppMutation({ refetchQueries: [{ query: GetAppDocument, variables: { appId: info.id } }] });
  const [uninstall] = useUninstallAppMutation({ refetchQueries: [{ query: GetAppDocument, variables: { appId: info.id } }, { query: InstalledAppsDocument }] });
  const [stop] = useStopAppMutation({ refetchQueries: [{ query: GetAppDocument, variables: { appId: info.id } }] });
  const [start] = useStartAppMutation({ refetchQueries: [{ query: GetAppDocument, variables: { appId: info.id } }] });
  const [updateConfig] = useUpdateAppConfigMutation({ refetchQueries: [{ query: GetAppDocument, variables: { appId: info.id } }] });

  const updateAvailable = Number(app?.updateInfo?.current || 0) < Number(app?.updateInfo?.latest);

  const handleError = (error: unknown) => {
    if (error instanceof Error) {
      addToast({
        title: 'Error',
        description: error.message,
        status: 'error',
        position: 'top',
        isClosable: true,
      });
    }
  };

  const handleInstallSubmit = async (values: FormValues) => {
    installDisclosure.close();
    const { exposed, domain, ...form } = values;

    try {
      await install({
        variables: { input: { form, id: info.id, exposed: exposed || false, domain: domain || '' } },
        optimisticResponse: { installApp: { id: info.id, status: AppStatusEnum.Installing, __typename: 'App' } },
      });
    } catch (error) {
      handleError(error);
    }
  };

  const handleUnistallSubmit = async () => {
    uninstallDisclosure.close();
    try {
      await uninstall({ variables: { id: info.id }, optimisticResponse: { uninstallApp: { id: info.id, status: AppStatusEnum.Uninstalling, __typename: 'App' } } });
    } catch (error) {
      handleError(error);
    }
  };

  const handleStopSubmit = async () => {
    stopDisclosure.close();
    try {
      await stop({ variables: { id: info.id }, optimisticResponse: { stopApp: { id: info.id, status: AppStatusEnum.Stopping, __typename: 'App' } } });
    } catch (error) {
      handleError(error);
    }
  };

  const handleStartSubmit = async () => {
    try {
      await start({ variables: { id: info.id }, optimisticResponse: { startApp: { id: info.id, status: AppStatusEnum.Starting, __typename: 'App' } } });
    } catch (e: unknown) {
      handleError(e);
    }
  };

  const handleUpdateSettingsSubmit = async (values: FormValues) => {
    try {
      const { exposed, domain, ...form } = values;
      await updateConfig({ variables: { input: { form, id: info.id, exposed: exposed || false, domain: domain || '' } } });
      addToast({
        title: 'Success',
        description: 'App config updated successfully. Restart the app to apply the changes.',
        position: 'top',
        status: 'success',
        isClosable: true,
      });
      updateSettingsDisclosure.close();
    } catch (error) {
      handleError(error);
    }
  };

  const handleUpdateSubmit = async () => {
    updateDisclosure.close();
    try {
      await update({ variables: { id: info.id }, optimisticResponse: { updateApp: { id: info.id, status: AppStatusEnum.Updating, __typename: 'App' } } });
      addToast({
        title: 'Success',
        description: 'App updated successfully',
        position: 'top',
        status: 'success',
        isClosable: true,
      });
    } catch (error) {
      handleError(error);
    }
  };

  const handleOpen = () => {
    const { https } = info;
    const protocol = https ? 'https' : 'http';

    if (typeof window !== 'undefined') {
      // Current domain
      const domain = window.location.hostname;
      window.open(`${protocol}://${domain}:${info.port}${info.url_suffix || ''}`, '_blank', 'noreferrer');
    }
  };

  const newVersion = [app?.updateInfo?.dockerVersion ? `${app?.updateInfo?.dockerVersion}` : '', `(${String(app?.updateInfo?.latest)})`].join(' ');

  return (
    <div className="card">
      <InstallModal onSubmit={handleInstallSubmit} isOpen={installDisclosure.isOpen} onClose={installDisclosure.close} app={info} />
      <StopModal onConfirm={handleStopSubmit} isOpen={stopDisclosure.isOpen} onClose={stopDisclosure.close} app={info} />
      <UninstallModal onConfirm={handleUnistallSubmit} isOpen={uninstallDisclosure.isOpen} onClose={uninstallDisclosure.close} app={info} />
      <UpdateModal onConfirm={handleUpdateSubmit} isOpen={updateDisclosure.isOpen} onClose={updateDisclosure.close} app={info} newVersion={newVersion} />
      <UpdateSettingsModal
        onSubmit={handleUpdateSettingsSubmit}
        isOpen={updateSettingsDisclosure.isOpen}
        onClose={updateSettingsDisclosure.close}
        app={info}
        config={app?.config}
        exposed={app?.exposed}
        domain={app?.domain || ''}
      />
      <div className="card-header d-flex flex-column flex-md-row">
        <AppLogo id={info.id} size={130} alt={info.name} />
        <div className="w-100 d-flex flex-column ms-md-3 align-items-center align-items-md-start">
          <div className="">
            <span className="mt-1 me-1">Version: </span>
            <span className="badge bg-gray mt-2">{info?.version}</span>
          </div>
          <span className="mt-2 text-muted text-center mb-2">{info.short_desc}</span>
          {app && app?.status !== AppStatusEnum.Missing && <AppStatus status={app.status} />}
          <AppActions
            updateAvailable={updateAvailable}
            onUpdate={updateDisclosure.open}
            onUpdateSettings={updateSettingsDisclosure.open}
            onStop={stopDisclosure.open}
            onCancel={stopDisclosure.open}
            onUninstall={uninstallDisclosure.open}
            onInstall={installDisclosure.open}
            onOpen={handleOpen}
            onStart={handleStartSubmit}
            app={info}
            status={app?.status}
          />
        </div>
      </div>
      <AppDetailsTabs info={info} />
    </div>
  );
};

export default AppDetailsContainer;
