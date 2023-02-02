import React from 'react';
import { InstallForm } from '../InstallForm';
import { Modal, ModalBody, ModalHeader } from '../../../../components/ui/Modal';
import { AppInfo } from '../../../../core/types';
import { FormValues } from '../InstallForm/InstallForm';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
}

export const InstallModal: React.FC<IProps> = ({ info, isOpen, onClose, onSubmit }) => (
  <Modal onClose={onClose} isOpen={isOpen}>
    <ModalHeader>
      <h5 className="modal-title">Install {info.name}</h5>
    </ModalHeader>
    <ModalBody>
      <InstallForm onSubmit={onSubmit} formFields={info.form_fields} exposable={info.exposable} />
    </ModalBody>
  </Modal>
);
