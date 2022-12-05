import React from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../../../../components/ui/Modal';

interface IProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export const RestartModal: React.FC<IProps> = ({ isOpen, onClose, onConfirm, loading }) => (
  <Modal size="sm" onClose={onClose} isOpen={isOpen}>
    <ModalHeader>
      <h5 className="modal-title">Restart Tipi</h5>
    </ModalHeader>
    <ModalBody>
      <div className="text-muted">Would you like to restart your Tipi server?</div>
    </ModalBody>
    <ModalFooter>
      <Button data-testid="settings-modal-restart-button" onClick={onConfirm} className="btn-danger" loading={loading}>
        Restart
      </Button>
    </ModalFooter>
  </Modal>
);
