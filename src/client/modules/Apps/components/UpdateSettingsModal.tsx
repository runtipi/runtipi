import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/Dialog';
import { InstallForm } from './InstallForm';
import { AppInfo } from '../../../core/types';
import { FormValues } from './InstallForm/InstallForm';

interface IProps {
  info: AppInfo;
  config: Record<string, unknown>;
  isOpen: boolean;
  exposed?: boolean;
  domain?: string;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
}

export const UpdateSettingsModal: React.FC<IProps> = ({ info, config, isOpen, onClose, onSubmit, exposed, domain }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent>
      <DialogHeader>
        <h5 className="modal-title">Update {info.name} config</h5>
      </DialogHeader>
      <DialogDescription>
        <InstallForm onSubmit={onSubmit} formFields={info.form_fields} info={info} initalValues={{ ...config, exposed, domain }} />
      </DialogDescription>
    </DialogContent>
  </Dialog>
);
