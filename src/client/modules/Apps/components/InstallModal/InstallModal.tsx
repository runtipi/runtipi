import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/Dialog';
import { InstallForm } from '../InstallForm';
import { AppInfo } from '../../../../core/types';
import { FormValues } from '../InstallForm/InstallForm';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
}

export const InstallModal: React.FC<IProps> = ({ info, isOpen, onClose, onSubmit }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent>
      <DialogHeader>
        <h5 className="modal-title">Install {info.name}</h5>
      </DialogHeader>
      <DialogDescription>
        <InstallForm onSubmit={onSubmit} formFields={info.form_fields} info={info} />
      </DialogDescription>
    </DialogContent>
  </Dialog>
);
