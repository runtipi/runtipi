import { Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay } from '@chakra-ui/react';
import React from 'react';
import InstallForm from './InstallForm';
import { App, AppInfo } from '../../../generated/graphql';

interface IProps {
  app: AppInfo;
  config: App['config'];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, any>) => void;
}

const UpdateSettingsModal: React.FC<IProps> = ({ app, config, isOpen, onClose, onSubmit }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Update {app.name} config</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <InstallForm onSubmit={onSubmit} formFields={app.form_fields} initalValues={config} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default UpdateSettingsModal;
