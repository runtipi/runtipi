import { SlideFade, Image, VStack, Flex, Divider, useDisclosure, useToast } from '@chakra-ui/react';
import React from 'react';
import { FiExternalLink } from 'react-icons/fi';
import { AppConfig } from '../../../core/types';
import { useAppsStore } from '../../../state/appsStore';
import { useNetworkStore } from '../../../state/networkStore';
import AppActions from '../components/AppActions';
import InstallModal from '../components/InstallModal';
import StopModal from '../components/StopModal';
import UninstallModal from '../components/UninstallModal';
import UpdateModal from '../components/UpdateModal';

interface IProps {
  app: AppConfig;
}

const AppDetails: React.FC<IProps> = ({ app }) => {
  const toast = useToast();
  const installDisclosure = useDisclosure();
  const uninstallDisclosure = useDisclosure();
  const stopDisclosure = useDisclosure();
  const updateDisclosure = useDisclosure();

  const { internalIp } = useNetworkStore();
  const { install, update, uninstall, stop, start, fetchApp } = useAppsStore();

  const handleError = (error: unknown) => {
    if (error instanceof Error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        position: 'top',
        isClosable: true,
      });
      fetchApp(app.id);
    }
  };

  const handleInstallSubmit = async (values: Record<string, any>) => {
    installDisclosure.onClose();
    try {
      await install(app.id, values);
    } catch (error) {
      handleError(error);
    }
  };

  const handleUnistallSubmit = async () => {
    uninstallDisclosure.onClose();
    try {
      await uninstall(app.id);
    } catch (error) {
      handleError(error);
    }
  };

  const handleStopSubmit = async () => {
    stopDisclosure.onClose();
    try {
      await stop(app.id);
    } catch (error) {
      handleError(error);
    }
  };

  const handleStartSubmit = async () => {
    try {
      await start(app.id);
    } catch (e: unknown) {
      handleError(e);
    }
  };

  const handleUpdateSubmit = async (values: Record<string, any>) => {
    try {
      await update(app.id, values);
      toast({
        title: 'Success',
        description: 'App config updated successfully',
        position: 'top',
        status: 'success',
      });
      updateDisclosure.onClose();
    } catch (error) {
      handleError(error);
    }
  };

  const handleOpen = () => {
    window.open(`http://${internalIp}:${app.port}`, '_blank');
  };

  return (
    <SlideFade in className="flex flex-1" offsetY="20px">
      <div className="flex flex-1  p-4 mt-3 rounded-lg flex-col">
        <Flex className="flex-col md:flex-row">
          <Image src={app?.image} height={180} width={180} className="rounded-xl self-center sm:self-auto" alt={app.name} />
          <VStack align="flex-start" justify="space-between" className="ml-0 md:ml-4">
            <div className="mt-3 items-center self-center flex flex-col sm:items-start sm:self-start md:mt-0">
              <h1 className="font-bold text-2xl">{app?.name}</h1>
              <h2 className="text-center md:text-left">{app?.short_desc}</h2>
              {app.source && (
                <a target="_blank" rel="noreferrer" className="text-blue-500 text-xs" href={app?.source}>
                  <Flex className="mt-2 items-center">
                    <FiExternalLink className="ml-1" />
                  </Flex>
                </a>
              )}
              <p className="text-xs text-gray-600">By {app?.author}</p>
            </div>
            <div className="flex justify-center sm:absolute md:static top-0 right-5 self-center sm:self-auto">
              <AppActions
                onUpdate={updateDisclosure.onOpen}
                onOpen={handleOpen}
                onStart={handleStartSubmit}
                onStop={stopDisclosure.onOpen}
                onUninstall={uninstallDisclosure.onOpen}
                onInstall={installDisclosure.onOpen}
                app={app}
              />
            </div>
          </VStack>
        </Flex>
        <Divider className="mt-5" />
        <p className="mt-3">{app?.description}</p>
        <InstallModal onSubmit={handleInstallSubmit} isOpen={installDisclosure.isOpen} onClose={installDisclosure.onClose} app={app} />
        <UninstallModal onConfirm={handleUnistallSubmit} isOpen={uninstallDisclosure.isOpen} onClose={uninstallDisclosure.onClose} app={app} />
        <StopModal onConfirm={handleStopSubmit} isOpen={stopDisclosure.isOpen} onClose={stopDisclosure.onClose} app={app} />
        <UpdateModal onSubmit={handleUpdateSubmit} isOpen={updateDisclosure.isOpen} onClose={updateDisclosure.onClose} app={app} />
      </div>
    </SlideFade>
  );
};

export default AppDetails;
