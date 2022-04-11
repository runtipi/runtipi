import { SlideFade, Image, VStack, Flex, Divider, useDisclosure } from '@chakra-ui/react';
import React from 'react';
import { FiExternalLink } from 'react-icons/fi';
import { AppConfig } from '../../../core/types';
import AppActions from '../components/AppActions';
import InstallModal from '../components/InstallModal';

interface IProps {
  app: AppConfig;
}

const AppDetails: React.FC<IProps> = ({ app }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleInstallSubmit = (values: Record<string, unknown>) => {
    console.error(values);
  };

  return (
    <SlideFade in className="flex flex-1" offsetY="20px">
      <div className="flex flex-1 bg-white p-4 mt-3 rounded-lg drop-shadow-xl flex-col">
        <Flex className="flex-col md:flex-row">
          <Image src={app?.image} height={180} width={180} className="rounded-xl self-center sm:self-auto" alt={app.name} />
          <VStack align="flex-start" justify="space-between" className="ml-0 md:ml-4">
            <div className="mt-3 items-center self-center flex flex-col sm:items-start sm:self-start md:mt-0">
              <h1 className="font-bold text-2xl">{app?.name}</h1>
              <h2 className="text-center md:text-left">{app?.short_desc}</h2>
              <a target="_blank" rel="noreferrer" className="text-blue-500 text-xs" href={app?.source}>
                <Flex className="mt-2 items-center">
                  {app?.source} <FiExternalLink className="ml-1" />
                </Flex>
              </a>
              <p className="text-xs text-gray-600">By {app?.author}</p>
            </div>
            <div className="flex justify-center sm:absolute md:static top-0 right-5 self-center sm:self-auto">
              <AppActions onStart={() => null} onStop={() => null} onUninstall={() => null} onInstall={onOpen} app={app} />
            </div>
          </VStack>
        </Flex>
        <Divider className="mt-5" />
        <p className="mt-3">{app?.description}</p>
        <InstallModal onSubmit={handleInstallSubmit} isOpen={isOpen} onClose={onClose} app={app} />
      </div>
    </SlideFade>
  );
};

export default AppDetails;
