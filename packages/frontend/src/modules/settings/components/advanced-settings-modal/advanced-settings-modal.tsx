import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import type { useDisclosure } from '@/lib/hooks/use-disclosure';
import { useTranslation } from 'react-i18next';

interface IProps {
  onEnable: () => void;
  advancedSettingsDisclosure: ReturnType<typeof useDisclosure>;
}

export const AdvancedSettingsModal = (props: IProps) => {
  const { advancedSettingsDisclosure, onEnable } = props;
  const { t } = useTranslation();

  return (
    <div>
      <Dialog open={advancedSettingsDisclosure.isOpen} onOpenChange={advancedSettingsDisclosure.toggle}>
        <DialogContent size="sm" type="warning">
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_GENERAL_ADVANCED_SETTINGS_MODAL_TITLE')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <span className="text-muted">{t('SETTINGS_GENERAL_ADVANCED_SETTINGS_MODAL_SUBTITLE')}</span>
          </DialogDescription>
          <DialogFooter>
            <Button onClick={() => advancedSettingsDisclosure.close()}>{t('ACTIONS_CANCEL')}</Button>
            <Button intent="warning" onClick={onEnable}>
              {t('ACTIONS_ENABLE')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
