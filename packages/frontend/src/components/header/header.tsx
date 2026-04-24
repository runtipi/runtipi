import { logoutMutation } from '@/api-client/@tanstack/react-query.gen';
import { useIsMutating, useMutation } from '@tanstack/react-query';
import { BaseHeader } from './base-header';
import { NavBar } from '../navbar/navbar';

type HeaderProps = {
  isUpdateAvailable: boolean;
  isLoggedIn: boolean;
  allowAutoThemes: boolean;
};

export const Header = (props: HeaderProps) => {
  const { isUpdateAvailable, allowAutoThemes, isLoggedIn } = props;
  const pendingMutations = useIsMutating();

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
      logoutDisabled={pendingMutations > 0 || logout.isPending}
      showNav
      onLogout={handleLogout}
      navbarContent={<NavBar isUpdateAvailable={isUpdateAvailable} />}
    />
  );
};
