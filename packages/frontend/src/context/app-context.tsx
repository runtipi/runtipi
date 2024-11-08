import { type QueryClient, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect } from 'react';
import type { AppContextDto } from '@/api-client';
import { appContextOptions, appContextQueryKey, systemLoadOptions } from '@/api-client/@tanstack/react-query.gen';
import { searchAppsFn } from '@/lib/api/search-apps';

interface AppContextValue extends AppContextDto {
  refreshAppContext: () => Promise<void>;
  setAppContext: (newAppContext: Partial<AppContextDto>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// Optimistically prefetch pages that are likely to be visited
const prefetch = async (queryClient: QueryClient) => {
  queryClient.ensureInfiniteQueryData({ queryKey: ['app-store', '', null], queryFn: searchAppsFn({}), initialPageParam: undefined });
  queryClient.ensureQueryData(systemLoadOptions());
};

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    prefetch(queryClient);
  }, [queryClient]);

  const queryKey = appContextQueryKey();
  const {
    data: appContext,
    error,
    isFetching,
  } = useSuspenseQuery({
    ...appContextOptions(),
  });

  if (error && !isFetching) {
    throw error;
  }

  const refreshAppContext = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const value = {
    ...appContext,
    refreshAppContext,
    setAppContext: (newAppContext: Partial<AppContextDto>) => {
      queryClient.setQueryData(['appContext'], { ...appContext, ...newAppContext });
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === null) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};
