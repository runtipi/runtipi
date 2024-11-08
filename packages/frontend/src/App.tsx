import { Navigate } from 'react-router-dom';
import { useUserContext } from './context/user-context';

export const App = () => {
  const { isLoggedIn, isConfigured, isGuestDashboardEnabled } = useUserContext();

  if (isLoggedIn || isGuestDashboardEnabled) {
    return <Navigate to="/dashboard" />;
  }

  if (isConfigured) {
    return <Navigate to="/login" />;
  }

  return <Navigate to="/register" />;
};
