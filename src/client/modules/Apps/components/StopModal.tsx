import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { AppInfo } from '../../../core/types';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const StopModal: React.FC<IProps> = ({ info, isOpen, onClose, onConfirm }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent size="sm">
      <DialogHeader>
        <h5 className="modal-title">Stop {info.name} ?</h5>
      </DialogHeader>
      <DialogDescription>
        <div className="text-muted">All data will be retained</div>
      </DialogDescription>
      <DialogFooter>
        <Button onClick={onConfirm} className="btn-danger">
          Stop
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
