import { updateAllAppsMutation } from '@/api-client/@tanstack/react-query.gen';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

type BulkUpdateResult = { urn: string; status: 'accepted' | 'rejected' | 'skipped'; message?: string };

const countByStatus = (data: unknown, status: BulkUpdateResult['status']) =>
  Array.isArray(data) ? data.filter((result: BulkUpdateResult | null) => result?.status === status).length : 0;

/**
 * Runs the bulk "update all" action and reports the outcome.
 * Apps whose update notices require manual confirmation are never updated by
 * the bulk action; they are reported as skipped so the user updates them
 * individually from the update wizard.
 */
export const useUpdateAllApps = (onStart?: () => void) => {
  const { t } = useTranslation();

  return useMutation({
    ...updateAllAppsMutation(),
    onMutate: () => {
      onStart?.();
    },
    onSuccess: (data) => {
      const skippedCount = countByStatus(data, 'skipped');
      const acceptedCount = countByStatus(data, 'accepted');

      if (skippedCount > 0) {
        toast(t('APP_UPDATE_ALL_SKIPPED_NOTICES', { count: skippedCount }), { icon: '⚠️', duration: 8000 });
      }
      if (acceptedCount > 0) {
        toast.loading(t('MY_APPS_UPDATE_ALL_IN_PROGRESS'), { duration: 3000 });
      }
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });
};
