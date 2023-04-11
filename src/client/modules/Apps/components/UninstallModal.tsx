import { IconAlertTriangle } from '@tabler/icons-react';
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

export const UninstallModal: React.FC<IProps> = ({ info, isOpen, onClose, onConfirm }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent type="danger" size="sm">
      <DialogHeader>
        <h5 className="modal-title">Uninstall {info.name} ?</h5>
      </DialogHeader>
      <DialogDescription className="text-center py-4">
        <IconAlertTriangle className="icon mb-2 text-danger icon-lg" />
        <h3>Are you sure?</h3>
        <div className="text-muted">All data for this app will be lost.</div>
      </DialogDescription>
      <DialogFooter>
        <Button onClick={onConfirm} className="btn-danger">
          Uninstall
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
