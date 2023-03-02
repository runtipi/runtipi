import React from 'react';
import { InstallForm } from './InstallForm';
import { Modal, ModalBody, ModalHeader } from '../../../components/ui/Modal';
import { AppInfo } from '../../../core/types';
import { FormValues } from './InstallForm/InstallForm';

interface IProps {
  info: AppInfo;
  config: Record<string, unknown>;
  isOpen: boolean;
  exposed?: boolean;
  domain?: string;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
}

export const UpdateSettingsModal: React.FC<IProps> = ({ info, config, isOpen, onClose, onSubmit, exposed, domain }) => (
  <Modal onClose={onClose} isOpen={isOpen}>
    <ModalHeader>
      <h5 className="modal-title">Update {info.name} config</h5>
    </ModalHeader>
    <ModalBody>
      <InstallForm onSubmit={onSubmit} formFields={info.form_fields} exposable={info.exposable} initalValues={{ ...config, exposed, domain }} />
    </ModalBody>
  </Modal>
);
