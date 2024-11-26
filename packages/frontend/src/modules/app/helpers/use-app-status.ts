import type { GetAppDto } from '@/api-client';
import { getAppQueryKey } from '@/api-client/@tanstack/react-query.gen';
import type { AppStatus } from '@/types/app.types';
import { useQueryClient } from '@tanstack/react-query';
import { produce } from 'immer';

export const useAppStatus = () => {
  const queryClient = useQueryClient();

  const setOptimisticStatus = (status: AppStatus, appId: string) => {
    const queryKey = getAppQueryKey({ path: { id: appId } });
    const data = queryClient.getQueryData(queryKey) as GetAppDto;

    const newData = produce(data, (draft) => {
      if (!draft.app) {
        draft.app = { id: appId, status } as GetAppDto['app'];
        return;
      }

      draft.app.status = status;
    });

    queryClient.setQueryData(queryKey, { ...newData });
  };

  return {
    setOptimisticStatus,
  };
};
