import React from 'react';
import InstallForm from './InstallForm';
import { AppInfo } from '../../../generated/graphql';
import { Modal, ModalBody, ModalHeader } from '../../../components/ui/Modal';

interface IProps {
  app: AppInfo;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, any>) => void;
}

const InstallModal: React.FC<IProps> = ({ app, isOpen, onClose, onSubmit }) => (
  <Modal onClose={onClose} isOpen={isOpen}>
    <ModalHeader>
      <h5 className="modal-title">Install {app.name}</h5>
    </ModalHeader>
    <ModalBody>
      <InstallForm onSubmit={onSubmit} formFields={app.form_fields} exposable={app.exposable} />
    </ModalBody>
  </Modal>
);

export default InstallModal;
