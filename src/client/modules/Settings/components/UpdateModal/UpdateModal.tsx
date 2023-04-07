import React from 'react';
import { Button } from '../../../../components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '../../../../components/ui/Dialog';

interface IProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export const UpdateModal: React.FC<IProps> = ({ isOpen, onClose, onConfirm, loading }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent size="sm">
      <DialogHeader>
        <h5 className="modal-title">Update Tipi</h5>
      </DialogHeader>
      <DialogDescription>
        <div className="text-muted">Would you like to update Tipi to the latest version?</div>
      </DialogDescription>
      <DialogFooter>
        <Button onClick={onConfirm} className="btn-success" loading={loading}>
          Update
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
