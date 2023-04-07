import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { Button } from '../../../../components/ui/Button';

interface IProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export const RestartModal: React.FC<IProps> = ({ isOpen, onClose, onConfirm, loading }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent type="danger" size="sm">
      <DialogHeader>
        <h5 className="modal-title">Restart Tipi</h5>
      </DialogHeader>
      <DialogDescription>
        <div className="text-muted">Would you like to restart your Tipi server?</div>
      </DialogDescription>
      <DialogFooter>
        <Button onClick={onConfirm} className="btn-danger" loading={loading}>
          Restart
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
