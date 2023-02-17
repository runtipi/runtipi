import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../../../components/ui/Modal';
import { AppInfo } from '../../../core/types';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const StopModal: React.FC<IProps> = ({ info, isOpen, onClose, onConfirm }) => (
  <Modal size="sm" onClose={onClose} isOpen={isOpen}>
    <ModalHeader>
      <h5 className="modal-title">Stop {info.name} ?</h5>
    </ModalHeader>
    <ModalBody>
      <div className="text-muted">All data will be retained</div>
    </ModalBody>
    <ModalFooter>
      <Button data-testid="modal-stop-button" onClick={onConfirm} className="btn-danger">
        Stop
      </Button>
    </ModalFooter>
  </Modal>
);
