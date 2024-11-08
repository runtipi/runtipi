import { useUIStore } from '@/stores/ui-store';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const LocationListener = () => {
  const { setActiveRoute } = useUIStore();
  const location = useLocation();

  useEffect(() => {
    // This will run whenever the URL changes
    setActiveRoute(location.pathname.substring(1));
  }, [location, setActiveRoute]);

  return null;
};
