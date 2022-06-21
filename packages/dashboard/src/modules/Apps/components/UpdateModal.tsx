import { Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay } from '@chakra-ui/react';
import React, { useEffect } from 'react';
import useSWR from 'swr';
import fetcher from '../../../core/fetcher';
import InstallForm from './InstallForm';
import { AppInfo } from '../../../generated/graphql';

interface IProps {
  app: AppInfo;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, any>) => void;
}

const UpdateModal: React.FC<IProps> = ({ app, isOpen, onClose, onSubmit }) => {
  const { data, mutate } = useSWR<Record<string, string>>(`/apps/form/${app.id}`, fetcher, { refreshInterval: 10 });

  useEffect(() => {
    mutate({}, true);
  }, [isOpen, mutate]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Update {app.name} config</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <InstallForm onSubmit={onSubmit} formFields={app.form_fields} initalValues={data} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default UpdateModal;
