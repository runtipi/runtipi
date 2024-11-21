import { useUIStore } from '@/stores/ui-store';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const LocationListener = () => {
  const setActiveRoute = useUIStore((state) => state.setActiveRoute);
  const activeRoute = useUIStore((state) => state.activeRoute);

  const location = useLocation();

  useEffect(() => {
    const newRoute = location.pathname.substring(1);
    if (activeRoute !== newRoute) {
      // This will run whenever the URL changes
      setActiveRoute(newRoute);
    }
  }, [location, activeRoute, setActiveRoute]);

  return null;
};
