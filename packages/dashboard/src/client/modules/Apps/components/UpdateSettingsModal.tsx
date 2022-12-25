import React from 'react';
import { InstallForm } from './InstallForm';
import { App, AppInfo } from '../../../generated/graphql';
import { Modal, ModalBody, ModalHeader } from '../../../components/ui/Modal';

interface IProps {
  app: AppInfo;
  config: App['config'];
  isOpen: boolean;
  exposed?: boolean;
  domain?: string;
  onClose: () => void;
  onSubmit: (values: Record<string, any>) => void;
}

export const UpdateSettingsModal: React.FC<IProps> = ({ app, config, isOpen, onClose, onSubmit, exposed, domain }) => (
  <Modal onClose={onClose} isOpen={isOpen}>
    <ModalHeader>
      <h5 className="modal-title">Update {app.name} config</h5>
    </ModalHeader>
    <ModalBody>
      <InstallForm onSubmit={onSubmit} formFields={app.form_fields} exposable={app.exposable} initalValues={{ ...config, exposed, domain }} />
    </ModalBody>
  </Modal>
);
