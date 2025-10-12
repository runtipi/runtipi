import { logoutMutation } from '@/api-client/@tanstack/react-query.gen';
import { useMutation } from '@tanstack/react-query';
import { BaseHeader } from './base-header';
import { NavBar } from '../navbar/navbar';

type HeaderProps = {
  isUpdateAvailable: boolean;
  isLoggedIn: boolean;
  allowAutoThemes: boolean;
};

export const Header = (props: HeaderProps) => {
  const { isUpdateAvailable, allowAutoThemes, isLoggedIn } = props;

  const logout = useMutation({
    ...logoutMutation(),
    onSuccess: () => {
      window.location.reload();
    },
  });

  const handleLogout = () => {
    logout.mutate({});
  };

  return (
    <BaseHeader
      isLoggedIn={isLoggedIn}
      allowAutoThemes={allowAutoThemes}
      showNav
      onLogout={handleLogout}
      navbarContent={<NavBar isUpdateAvailable={isUpdateAvailable} />}
    />
  );
};
