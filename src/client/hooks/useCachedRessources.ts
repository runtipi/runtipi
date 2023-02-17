import { useEffect, useState, useCallback } from 'react';

interface IReturnProps {
  isLoadingComplete?: boolean;
}

export default function useCachedResources(): IReturnProps {
  const [isLoadingComplete, setLoadingComplete] = useState(false);

  const loadResourcesAndDataAsync = useCallback(() => {
    try {
      // Load any resources or data that we need prior to rendering the app
    } catch (error) {
      // We might want to provide this error information to an error reporting service
      console.error(error);
    }
  }, []);

  useEffect(() => {
    loadResourcesAndDataAsync();
  }, [loadResourcesAndDataAsync]);

  useEffect(() => {
    setLoadingComplete(true);
  }, []);

  return { isLoadingComplete };
}
