import React from 'react';
import { AppInfo } from '../../../generated/graphql';
import { Button } from '../../../components/ui/Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../../../components/ui/Modal';

interface IProps {
  app: AppInfo;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const StopModal: React.FC<IProps> = ({ app, isOpen, onClose, onConfirm }) => (
  <Modal size="sm" onClose={onClose} isOpen={isOpen}>
    <ModalHeader>
      <h5 className="modal-title">Stop {app.name} ?</h5>
    </ModalHeader>
    <ModalBody>
      <div className="text-muted">All data will be retained</div>
    </ModalBody>
    <ModalFooter>
      <Button onClick={onConfirm} className="btn-danger">
        Stop
      </Button>
    </ModalFooter>
  </Modal>
);
