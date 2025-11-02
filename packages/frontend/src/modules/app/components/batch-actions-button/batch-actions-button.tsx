import { restartAllAppsMutation, startAllAppsMutation, stopAllAppsMutation, updateAllAppsMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { TranslatableError } from '@/types/error.types';
import { IconChevronDown, IconPlayerPause, IconPlayerPlay, IconRefresh, IconRotateClockwise } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import React from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

type BatchAction = 'start-all' | 'stop-all' | 'restart-all' | 'update-all';

type Props = {
  availableUpdates: number;
};

type BatchActionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: BatchAction | null;
};

const BatchActionDialog = ({ isOpen, onClose, onConfirm, action }: BatchActionDialogProps) => {
  const { t } = useTranslation();

  if (!action) return null;

  const actionConfig = {
    'start-all': {
      title: t('MY_APPS_START_ALL_FORM_TITLE'),
      subtitle: t('MY_APPS_START_ALL_FORM_SUBTITLE'),
      submit: t('MY_APPS_START_ALL_FORM_SUBMIT'),
    },
    'stop-all': {
      title: t('MY_APPS_STOP_ALL_FORM_TITLE'),
      subtitle: t('MY_APPS_STOP_ALL_FORM_SUBTITLE'),
      submit: t('MY_APPS_STOP_ALL_FORM_SUBMIT'),
    },
    'restart-all': {
      title: t('MY_APPS_RESTART_ALL_FORM_TITLE'),
      subtitle: t('MY_APPS_RESTART_ALL_FORM_SUBTITLE'),
      submit: t('MY_APPS_RESTART_ALL_FORM_SUBMIT'),
    },
    'update-all': {
      title: t('MY_APPS_UPDATE_ALL_FORM_TITLE'),
      subtitle: `${t('MY_APPS_UPDATE_ALL_FORM_SUBTITLE_1')}\n\n${t('MY_APPS_UPDATE_ALL_FORM_SUBTITLE_2')}`,
      submit: t('MY_APPS_UPDATE_ALL_FORM_SUBMIT'),
    },
  };

  const config = actionConfig[action];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <div className="text-muted" style={{ whiteSpace: 'pre-line' }}>
            {config.subtitle}
          </div>
        </DialogDescription>
        <DialogFooter>
          <Button onClick={onConfirm} intent="success">
            {config.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const BatchActionsButton = ({ availableUpdates }: Props) => {
  const dialogDisclosure = useDisclosure();
  const dropdownDisclosure = useDisclosure();
  const { t } = useTranslation();
  const [selectedAction, setSelectedAction] = React.useState<BatchAction | null>(null);

  const startAllMutation = useMutation({
    ...startAllAppsMutation(),
    onMutate: () => {
      dialogDisclosure.close();
      dropdownDisclosure.close();
    },
    onSuccess: () => {
      toast.loading(t('MY_APPS_START_ALL_IN_PROGRESS'), { duration: 3000 });
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const stopAllMutation = useMutation({
    ...stopAllAppsMutation(),
    onMutate: () => {
      dialogDisclosure.close();
      dropdownDisclosure.close();
    },
    onSuccess: () => {
      toast.loading(t('MY_APPS_STOP_ALL_IN_PROGRESS'), { duration: 3000 });
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const restartAllMutation = useMutation({
    ...restartAllAppsMutation(),
    onMutate: () => {
      dialogDisclosure.close();
      dropdownDisclosure.close();
    },
    onSuccess: () => {
      toast.loading(t('MY_APPS_RESTART_ALL_IN_PROGRESS'), { duration: 3000 });
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const updateAllMutation = useMutation({
    ...updateAllAppsMutation(),
    onMutate: () => {
      dialogDisclosure.close();
      dropdownDisclosure.close();
    },
    onSuccess: () => {
      toast.loading(t('MY_APPS_UPDATE_ALL_IN_PROGRESS'), { duration: 3000 });
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const handleActionClick = (action: BatchAction) => {
    setSelectedAction(action);
    dialogDisclosure.open();
  };

  const handleConfirm = () => {
    switch (selectedAction) {
      case 'start-all':
        startAllMutation.mutate({});
        break;
      case 'stop-all':
        stopAllMutation.mutate({});
        break;
      case 'restart-all':
        restartAllMutation.mutate({});
        break;
      case 'update-all':
        updateAllMutation.mutate({});
        break;
    }
  };

  return (
    <>
      <BatchActionDialog isOpen={dialogDisclosure.isOpen} onClose={dialogDisclosure.close} onConfirm={handleConfirm} action={selectedAction} />
      <DropdownMenu open={dropdownDisclosure.isOpen} onOpenChange={dropdownDisclosure.toggle}>
        <DropdownMenuTrigger asChild>
          <Button size="icon" intent="default" className="d-flex align-items-center gap-2 mt-2 px-3">
            <span>{t('MY_APPS_BATCH_ACTIONS')}</span>
            <IconChevronDown size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleActionClick('start-all')}>
            <IconPlayerPlay className="me-2" size={16} />
            {t('MY_APPS_START_ALL_FORM_SUBMIT')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleActionClick('stop-all')}>
            <IconPlayerPause className="me-2" size={16} />
            {t('MY_APPS_STOP_ALL_FORM_SUBMIT')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleActionClick('restart-all')}>
            <IconRotateClockwise className="me-2" size={16} />
            {t('MY_APPS_RESTART_ALL_FORM_SUBMIT')}
          </DropdownMenuItem>
          {availableUpdates >= 2 && (
            <DropdownMenuItem onClick={() => handleActionClick('update-all')}>
              <IconRefresh className="me-2" size={16} />
              {t('MY_APPS_UPDATE_ALL_FORM_SUBMIT')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
