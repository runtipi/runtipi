import React from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../../../../components/ui/Modal';

interface IProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export const UpdateModal: React.FC<IProps> = ({ isOpen, onClose, onConfirm, loading }) => (
  <Modal size="sm" onClose={onClose} isOpen={isOpen}>
    <ModalHeader>
      <h5 className="modal-title">Update Tipi</h5>
    </ModalHeader>
    <ModalBody>
      <div className="text-muted">Would you like to update Tipi to the latest version?</div>
    </ModalBody>
    <ModalFooter>
      <Button onClick={onConfirm} className="btn-success" loading={loading}>
        Update
      </Button>
    </ModalFooter>
  </Modal>
);
