import { Navigate } from 'react-router';
import { useUserContext } from './context/user-context';

export default () => {
  const { isLoggedIn, isConfigured, isGuestDashboardEnabled } = useUserContext();

  if (isLoggedIn || isGuestDashboardEnabled) {
    return <Navigate to="/dashboard" />;
  }

  if (isConfigured) {
    return <Navigate to="/login" />;
  }

  return <Navigate to="/register" />;
};
