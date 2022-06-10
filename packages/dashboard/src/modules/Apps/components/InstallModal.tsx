import { Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay } from '@chakra-ui/react';
import React from 'react';
import { AppConfig } from '@runtipi/common';
import InstallForm from './InstallForm';

interface IProps {
  app: AppConfig;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, any>) => void;
}

const InstallModal: React.FC<IProps> = ({ app, isOpen, onClose, onSubmit }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Install {app.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <InstallForm onSubmit={onSubmit} formFields={app.form_fields} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default InstallModal;
