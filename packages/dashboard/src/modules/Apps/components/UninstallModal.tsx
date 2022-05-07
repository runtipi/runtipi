import { Button, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay } from '@chakra-ui/react';
import React from 'react';
import { AppConfig } from '../../../core/types';

interface IProps {
  app: AppConfig;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const UninstallModal: React.FC<IProps> = ({ app, isOpen, onClose, onConfirm }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Uninstall {app.name} ?</ModalHeader>
        <ModalCloseButton />
        <ModalBody>All data for this app will be lost.</ModalBody>
        <ModalFooter>
          <Button onClick={onConfirm} colorScheme="red">
            Uninstall
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default UninstallModal;
