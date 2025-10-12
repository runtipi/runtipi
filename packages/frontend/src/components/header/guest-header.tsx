import { useNavigate } from 'react-router';
import { BaseHeader } from './base-header';

export const GuestHeader = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  return <BaseHeader isLoggedIn={false} allowAutoThemes showCertificateButton onLogin={handleLogin} />;
};
