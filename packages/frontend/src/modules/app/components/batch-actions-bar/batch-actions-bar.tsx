import { restartAllAppsMutation, startAllAppsMutation, stopAllAppsMutation, updateAllAppsMutation } from '@/api-client/@tanstack/react-query.gen';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import type { TranslatableError } from '@/types/error.types';
import { IconDots, IconLinkPlus, IconPlayerPlayFilled, IconPlayerStopFilled, IconRefresh, IconRotateClockwise } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { type BatchAction, BatchActionDialog } from '../batch-actions-dialog/batch-actions-dialog';

const IN_PROGRESS_KEYS: Record<BatchAction, string> = {
  'start-all': 'MY_APPS_START_ALL_IN_PROGRESS',
  'stop-all': 'MY_APPS_STOP_ALL_IN_PROGRESS',
  'restart-all': 'MY_APPS_RESTART_ALL_IN_PROGRESS',
  'update-all': 'MY_APPS_UPDATE_ALL_IN_PROGRESS',
};

type Props = {
  updatesAvailable: number;
  onAddLink: () => void;
};

/**
 * Start all / Stop all buttons and a menu with the other batch actions, shown in the My apps top bar.
 */
export const BatchActionsBar = ({ updatesAvailable, onAddLink }: Props) => {
  const { t } = useTranslation();
  const [action, setAction] = useState<BatchAction | null>(null);

  const options = (batchAction: BatchAction) => ({
    onMutate: () => setAction(null),
    onSuccess: () => {
      toast.loading(t(IN_PROGRESS_KEYS[batchAction]), { duration: 3000 });
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const mutations = {
    'start-all': useMutation({ ...startAllAppsMutation(), ...options('start-all') }),
    'stop-all': useMutation({ ...stopAllAppsMutation(), ...options('stop-all') }),
    'restart-all': useMutation({ ...restartAllAppsMutation(), ...options('restart-all') }),
    'update-all': useMutation({ ...updateAllAppsMutation(), ...options('update-all') }),
  };

  return (
    <>
      <button type="button" className="rt-btn" onClick={() => setAction('start-all')}>
        <IconPlayerPlayFilled size={13} />
        {t('MY_APPS_START_ALL_FORM_SUBMIT')}
      </button>
      <button type="button" className="rt-btn" onClick={() => setAction('stop-all')}>
        <IconPlayerStopFilled size={12} />
        {t('MY_APPS_STOP_ALL_FORM_SUBMIT')}
      </button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button type="button" className="rt-icon-btn rt-icon-btn--lg" aria-label={t('MY_APPS_BATCH_ACTIONS')} title={t('MY_APPS_BATCH_ACTIONS')}>
            <IconDots size={18} stroke={1.8} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setAction('restart-all')}>
            <IconRotateClockwise className="me-2" size={16} />
            {t('MY_APPS_RESTART_ALL_FORM_SUBMIT')}
          </DropdownMenuItem>
          {updatesAvailable > 0 && (
            <DropdownMenuItem onClick={() => setAction('update-all')}>
              <IconRefresh className="me-2" size={16} />
              {t('MY_APPS_UPDATE_ALL_FORM_SUBMIT')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onAddLink}>
            <IconLinkPlus className="me-2" size={16} />
            {t('LINKS_ADD_TITLE')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BatchActionDialog
        isOpen={action !== null}
        onClose={() => setAction(null)}
        onConfirm={() => action && mutations[action].mutate({})}
        action={action}
      />
    </>
  );
};
