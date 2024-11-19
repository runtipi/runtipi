import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { userContextOptions, userContextQueryKey } from '@/api-client/@tanstack/react-query.gen';
import type { UserContextDto } from '@/api-client';

interface UserContextValue extends UserContextDto {
  refreshUserContext: () => Promise<void>;
  setUserContext: (newUserContext: Partial<UserContextDto>) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export const UserContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const queryKey = userContextQueryKey();
  const {
    data: userContext,
    error,
    isFetching,
  } = useSuspenseQuery({
    ...userContextOptions(),
  });

  if (error && !isFetching) {
    throw error;
  }

  const refreshUserContext = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const value = {
    ...userContext,
    refreshUserContext: refreshUserContext,
    setUserContext: (newUserContext: Partial<UserContextDto>) => {
      queryClient.setQueryData(['userContext'], { ...userContext, ...newUserContext });
    },
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (context === null) {
    throw new Error('useUserContext must be used within an UserContextProvider');
  }
  return context;
};
