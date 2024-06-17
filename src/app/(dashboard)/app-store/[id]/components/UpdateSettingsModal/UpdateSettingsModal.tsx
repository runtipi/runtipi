import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { AppInfo } from '@runtipi/shared';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { AppStatus } from '@/server/db/schema';
import { InstallForm, type FormValues } from '../InstallForm';
import { Tabs } from '@/components/ui/tabs';
import { SettingsTabTriggers } from '../SettingsTabTriggers';
import { TabsContent } from '@radix-ui/react-tabs';
import { Button } from '@/components/ui/Button';

interface IProps {
  info: AppInfo;
  config: Record<string, unknown>;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
  onReset: () => void;
  status?: AppStatus;
  onBackup: () => void;
  onRestore: (backup: string) => void;
  backups: string[];
}

export const UpdateSettingsModal: React.FC<IProps> = ({ info, config, isOpen, onClose, onSubmit, onReset, status, onBackup, onRestore, backups }) => {
  const t = useTranslations();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <h5 className="modal-title">{t('APP_UPDATE_SETTINGS_FORM_TITLE', { name: info.id })}</h5>
        </DialogHeader>
        <ScrollArea maxHeight={500}>
          <DialogDescription className="p-0">
            <Tabs defaultValue={'general'}>
              <SettingsTabTriggers appId={info.id} />
              <TabsContent value="general" className="p-3">
                <InstallForm
                  onSubmit={onSubmit}
                  formFields={info.form_fields}
                  info={info}
                  initialValues={{ ...config }}
                  onReset={onReset}
                  status={status}
                />
              </TabsContent>
              <TabsContent value="backups" className="p-3">
                <h3 className="mb-0">{t('APP_BACKUP_SUBMIT')}</h3>
                <div className="d-flex justify-content-between mb-2 mt-0">
                  <p className="text-muted my-auto">Manage backups for your app.</p>
                  <Button onClick={onBackup}>{t('APP_BACKUP_SUBMIT')}</Button>
                </div>
                <pre>
                  {backups.length !== 0 ? (
                    <div className="card">
                      {backups.map((backup) => (
                        <RenderBackup backup={backup} />
                      ))}
                    </div>
                  ) : (
                    <p className="mx-auto my-3 text-muted">No backups found! Why don't you create one?</p>
                  )}
                </pre>
              </TabsContent>
            </Tabs>
          </DialogDescription>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

interface props {
  backup: string;
  // onRestore: () => void;
  // onDelete: () => void;
}

const RenderBackup: React.FC<props> = ({ backup }) => {
  return (
    <div key={backup} className="card-body d-flex justify-content-between">
      <p className="my-auto">{backup}</p>
      <div>
        <Button className="btn-danger">Delete</Button>
        <Button className="ms-2">Restore</Button>
      </div>
    </div>
  );
};
