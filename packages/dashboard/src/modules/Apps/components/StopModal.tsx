import { Button, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay } from '@chakra-ui/react';
import React from 'react';
import { AppConfig } from '@runtipi/common';

interface IProps {
  app: AppConfig;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const StopModal: React.FC<IProps> = ({ app, isOpen, onClose, onConfirm }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Stop {app.name} ?</ModalHeader>
        <ModalCloseButton />
        <ModalBody>All the data will be retained.</ModalBody>
        <ModalFooter>
          <Button onClick={onConfirm} colorScheme="red">
            Stop
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default StopModal;
