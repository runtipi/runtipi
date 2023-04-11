import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { Button } from '../../../../components/ui/Button';
import { AppInfo } from '../../../../core/types';

interface IProps {
  newVersion: string;
  info: Pick<AppInfo, 'name'>;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const UpdateModal: React.FC<IProps> = ({ info, newVersion, isOpen, onClose, onConfirm }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent size="sm">
      <DialogHeader>
        <h5 className="modal-title">Update {info.name} ?</h5>
      </DialogHeader>
      <DialogDescription>
        <div className="text-muted">
          Update app to latest verion : <b>{newVersion}</b> ?<br />
          This will reset your custom configuration (e.g. changes in docker-compose.yml)
        </div>
      </DialogDescription>
      <DialogFooter>
        <Button onClick={onConfirm} className="btn-success">
          Update
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
