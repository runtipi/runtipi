import { Button, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay } from '@chakra-ui/react';
import React from 'react';
import { AppInfo } from '../../../generated/graphql';

interface IProps {
  newVersion: string;
  app: AppInfo;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const UpdateModal: React.FC<IProps> = ({ app, newVersion, isOpen, onClose, onConfirm }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Update {app.name} ?</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          Update app to latest verion : <b>{newVersion}</b> ?<br />
          This will reset your custom configuration (e.g. changes in docker-compose.yml)
        </ModalBody>
        <ModalFooter>
          <Button onClick={onConfirm} colorScheme="green">
            Update
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default UpdateModal;
