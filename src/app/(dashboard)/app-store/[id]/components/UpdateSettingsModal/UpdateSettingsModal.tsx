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
import { IconStackPop, IconStackPush } from '@tabler/icons-react';

interface IProps {
  info: AppInfo;
  config: Record<string, unknown>;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
  onReset: () => void;
  status?: AppStatus;
  onBackup: () => void;
  onRestore: () => void;
}

export const UpdateSettingsModal: React.FC<IProps> = ({ info, config, isOpen, onClose, onSubmit, onReset, status, onBackup, onRestore }) => {
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
                <h3 className="mb-1">{t('APP_BACKUP_SUBMIT')}</h3>
                <p className="text-muted mb-2">{t('APP_BACKUP_SETTINGS_SUBTITLE')}</p>
                <Button onClick={onBackup}>
                  {t('APP_BACKUP_SUBMIT')}
                  <IconStackPush className="ms-1" size={14} />
                </Button>
                <h3 className="mb-1 mt-3">{t('APP_RESTORE_SUBMIT')}</h3>
                <p className="text-muted mb-2">{t('APP_RESTORE_SETTINGS_SUBTITILE')}</p>
                <Button onClick={onRestore}>
                  {t('APP_RESTORE_SUBMIT')}
                  <IconStackPop className="ms-1" size={14} />
                </Button>
              </TabsContent>
            </Tabs>
          </DialogDescription>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
