import { updateAppMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Switch } from '@/components/ui/Switch';
import type { AppInfo } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import type React from 'react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Trans, useTranslation } from 'react-i18next';
import CodeMirror from '@uiw/react-codemirror';
import { copilot } from '@uiw/codemirror-theme-copilot';
import { unifiedMergeView } from '@codemirror/merge';
import { StepContent, Stepper, StepTrigger, StepTriggerList } from '@/components/ui/Stepper/Stepper';
import type { Sizes } from '@/components/ui/Dialog/Dialog';
import { motion } from 'framer-motion';
import { Alert, AlertDescription, AlertHeading, AlertIcon } from '@/components/ui/Alert/Alert';
import { IconInfoCircle } from '@tabler/icons-react';

interface IProps {
  newVersion: string;
  info: Pick<AppInfo, 'id' | 'name' | 'urn'>;
  isOpen: boolean;
  onClose: () => void;
  newConfig: string;
  currentConfig: string;
  newCompose: string;
  currentCompose: string;
}

const SIZE_MAP: Record<number, Sizes> = {
  0: 'md',
  1: 'lg',
  2: 'lg',
  3: 'md',
};

export const UpdateDialog: React.FC<IProps> = ({ info, newVersion, isOpen, newConfig, currentConfig, newCompose, currentCompose, onClose }) => {
  const { t } = useTranslation();
  const [backupApp, setBackupApp] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setBackupApp(true);
    }
  }, [isOpen]);

  const update = useMutation({
    ...updateAppMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onMutate: () => {
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size={SIZE_MAP[currentStep]}>
        <DialogHeader>
          <DialogTitle>{t('APP_UPDATE_FORM_TITLE', { name: info.name })}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={currentStep}>
            <Stepper currentStep={currentStep}>
              <StepTriggerList>
                <StepTrigger step={0} title={t('APP_UPDATE_INFORMATION_TITLE')} onStepChange={setCurrentStep} />
                <StepTrigger step={1} title={t('APP_UPDATE_CONFIGURATION_TITLE')} onStepChange={setCurrentStep} />
                <StepTrigger step={2} title={t('APP_UPDATE_COMPOSE_TITLE')} onStepChange={setCurrentStep} />
                <StepTrigger step={3} title={t('APP_UPDATE_BACKUP_TITLE')} onStepChange={setCurrentStep} />
              </StepTriggerList>
              <div className="mt-2">
                <StepContent step={0}>
                  <div className="text-muted">
                    <Trans
                      t={t}
                      i18nKey="APP_UPDATE_INFORMATION_SUBTITLE"
                      values={{
                        version: newVersion,
                        name: info.name,
                      }}
                      components={{ strong: <strong /> }}
                    />
                  </div>
                </StepContent>
                <StepContent step={1}>
                  <div className="text-muted">{t('APP_UPDATE_CONFIGURATION_SUBTITLE')}</div>
                  <CodeMirror
                    value={newConfig}
                    readOnly={true}
                    height="400px"
                    theme={copilot}
                    className="mt-3"
                    extensions={[
                      unifiedMergeView({
                        original: currentConfig,
                        mergeControls: false,
                      }),
                    ]}
                  />
                </StepContent>
                <StepContent step={2}>
                  <div className="text-muted">{t('APP_UPDATE_COMPOSE_SUBTITLE')}</div>
                  <CodeMirror
                    value={newCompose}
                    readOnly={true}
                    height="400px"
                    theme={copilot}
                    className="mt-3"
                    extensions={[
                      unifiedMergeView({
                        original: currentCompose,
                        mergeControls: false,
                      }),
                    ]}
                  />
                  <Alert variant="info" className="mt-3">
                    <AlertIcon>
                      <IconInfoCircle stroke={2} />
                    </AlertIcon>
                    <div>
                      <AlertHeading>{t('APP_UPDATE_COMPOSE_ALERT_TITLE')}</AlertHeading>
                      <AlertDescription>{t('APP_UPDATE_COMPOSE_ALERT_SUBTITLE')}</AlertDescription>
                    </div>
                  </Alert>
                </StepContent>
                <StepContent step={3}>
                  <div className="text-muted">{t('APP_UPDATE_BACKUP_SUBTITLE')}</div>
                  <Switch checked={backupApp} onCheckedChange={setBackupApp} label={t('APP_UPDATE_FORM_BACKUP')} className="mt-3" />
                </StepContent>
              </div>
            </Stepper>
          </motion.div>
        </DialogDescription>
        <DialogFooter>
          {currentStep > 0 && (
            <Button onClick={() => setCurrentStep((s) => s - 1)} className="me-2">
              {t('APP_UPDATE_FORM_BACK')}
            </Button>
          )}
          {currentStep < 3 && (
            <Button variant="outline" onClick={() => setCurrentStep((s) => s + 1)}>
              {t('APP_UPDATE_FORM_NEXT')}
            </Button>
          )}
          {currentStep === 3 && (
            <Button
              onClick={() =>
                update.mutate({
                  path: { urn: info.urn },
                  body: { performBackup: backupApp },
                })
              }
              intent="success"
            >
              {t('APP_UPDATE_FORM_SUBMIT')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
