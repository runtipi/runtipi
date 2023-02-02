import React from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../../../../components/ui/Modal';
import { AppInfo } from '../../../../core/types';

interface IProps {
  newVersion: string;
  info: Pick<AppInfo, 'name'>;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const UpdateModal: React.FC<IProps> = ({ info, newVersion, isOpen, onClose, onConfirm }) => (
  <Modal size="sm" onClose={onClose} isOpen={isOpen}>
    <ModalHeader>
      <h5 className="modal-title">Update {info.name} ?</h5>
    </ModalHeader>
    <ModalBody>
      <div className="text-muted">
        Update app to latest verion : <b>{newVersion}</b> ?<br />
        This will reset your custom configuration (e.g. changes in docker-compose.yml)
      </div>
    </ModalBody>
    <ModalFooter>
      <Button data-testid="modal-update-button" onClick={onConfirm} className="btn-success">
        Update
      </Button>
    </ModalFooter>
  </Modal>
);
