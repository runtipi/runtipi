import { logoutMutation } from '@/api-client/@tanstack/react-query.gen';
import { getLogo } from '@/lib/theme/theme';
import { useUIStore } from '@/stores/ui-store';
import { IconBrandGithub, IconHeart, IconLogin, IconLogout, IconMoon, IconSun } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { NavBar } from '../navbar/navbar';

type HeaderProps = {
  isUpdateAvailable: boolean;
  isLoggedIn: boolean;
  allowAutoThemes: boolean;
};

export const Header = (props: HeaderProps) => {
  const setDarkMode = useUIStore((state) => state.setDarkMode);

  const { isUpdateAvailable, allowAutoThemes, isLoggedIn } = props;

  const { t } = useTranslation();

  const navigate = useNavigate();

  const logout = useMutation({
    ...logoutMutation(),
    onSuccess: () => {
      navigate('/', { replace: true });
    },
  });

  return (
    <header className="text-white navbar navbar-expand-md navbar-dark navbar-overlap d-print-none" data-bs-theme="dark">
      <div className="container-xl">
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-menu">
          <span className="navbar-toggler-icon" />
        </button>
        <Link to="/">
          <h1 className="navbar-brand d-none-navbar-horizontal pe-0 pe-md-3">
            <img
              alt="Runtipi logo"
              className="navbar-brand-image me-3"
              width={100}
              height={100}
              src={getLogo(allowAutoThemes)}
              style={{
                width: '30px',
                maxWidth: '30px',
                height: 'auto',
              }}
            />
            Runtipi
          </h1>
        </Link>
        <div className="navbar-nav flex-row order-md-last">
          <div className="nav-item d-none d-xl-flex me-3">
            <div className="btn-list">
              <a href="https://github.com/runtipi/runtipi" target="_blank" rel="noreferrer" className="btn btn-dark">
                <IconBrandGithub data-testid="icon-github" className="me-1 icon" size={24} />
                {t('HEADER_SOURCE_CODE')}
              </a>
              <a href="https://github.com/runtipi/runtipi?sponsor=1" target="_blank" rel="noreferrer" className="btn btn-dark">
                <IconHeart className="me-1 icon text-pink" size={24} />
                {t('HEADER_SPONSOR')}
              </a>
            </div>
          </div>
          <div style={{ zIndex: 1 }} className="d-flex">
            <Tooltip className="tooltip" anchorSelect=".darkMode">
              {t('HEADER_DARK_MODE')}
            </Tooltip>
            <button
              type="button"
              onClick={() => setDarkMode(true)}
              className="darkMode nav-link px-0 hide-theme-dark cursor-pointer"
              data-testid="dark-mode-toggle"
            >
              <IconMoon data-testid="icon-moon" size={20} />
            </button>
            <Tooltip className="tooltip" anchorSelect=".lightMode">
              {t('HEADER_LIGHT_MODE')}
            </Tooltip>
            <button
              type="button"
              onClick={() => setDarkMode(false)}
              className="lightMode nav-link px-0 hide-theme-light cursor-pointer"
              data-testid="light-mode-toggle"
            >
              <IconSun data-testid="icon-sun" size={20} />
            </button>
            <Tooltip className="tooltip" anchorSelect=".logOut">
              {isLoggedIn ? t('HEADER_LOGOUT') : t('HEADER_LOGIN')}
            </Tooltip>
            <button
              type="button"
              onClick={() => logout.mutate({})}
              tabIndex={0}
              className="logOut nav-link px-0 cursor-pointer"
              data-testid="logout-button"
            >
              {isLoggedIn ? <IconLogout size={20} /> : <IconLogin size={20} />}
            </button>
          </div>
        </div>
        <NavBar isUpdateAvailable={isUpdateAvailable} />
      </div>
    </header>
  );
};
