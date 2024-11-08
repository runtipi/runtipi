import type { AppDetailsDto } from '@/api-client';
import { getAppDetailsQueryKey } from '@/api-client/@tanstack/react-query.gen';
import type { AppStatus } from '@/types/app.types';
import { useQueryClient } from '@tanstack/react-query';
import { produce } from 'immer';

export const useAppStatus = () => {
  const queryClient = useQueryClient();

  const setOptimisticStatus = (status: AppStatus, appId: string) => {
    const queryKey = getAppDetailsQueryKey({ path: { id: appId } });

    const data = queryClient.getQueryData(queryKey) as AppDetailsDto;

    const newData = produce(data, (draft) => {
      draft.app.status = status;
    });

    queryClient.setQueryData(queryKey, { ...newData });
  };

  return {
    setOptimisticStatus,
  };
};
