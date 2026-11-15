import { getLogo } from '@/lib/theme/theme';
import { getNextThemeMode, useUIStore } from '@/stores/ui-store';
import { IconBrandGithub, IconCertificate, IconHeart, IconLogin, IconLogout, IconMoon, IconSun, IconSunMoon } from '@tabler/icons-react';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Tooltip } from 'react-tooltip';

type BaseHeaderProps = {
  isLoggedIn: boolean;
  allowAutoThemes: boolean;
  showNav?: boolean;
  showCertificateButton?: boolean;
  logoutDisabled?: boolean;
  onLogout?: () => void;
  onLogin?: () => void;
  navbarContent?: ReactNode;
};

export const BaseHeader = (props: BaseHeaderProps) => {
  const {
    isLoggedIn,
    allowAutoThemes,
    showNav = false,
    showCertificateButton = false,
    logoutDisabled = false,
    onLogout,
    onLogin,
    navbarContent,
  } = props;

  const themeMode = useUIStore((state) => state.themeMode);
  const setThemeMode = useUIStore((state) => state.setThemeMode);

  const { t } = useTranslation();

  const downloadCertificate = () => {
    window.open('/api/system/certificate');
  };

  const handleThemeToggle = () => {
    setThemeMode(getNextThemeMode(themeMode));
  };

  const themeTooltip = themeMode === 'dark' ? t('HEADER_DARK_MODE') : themeMode === 'light' ? t('HEADER_LIGHT_MODE') : t('HEADER_SYSTEM_MODE');

  const handleLogoutClick = () => {
    if (isLoggedIn && onLogout) {
      onLogout();
    } else if (!isLoggedIn && onLogin) {
      onLogin();
    }
  };

  return (
    <header className="text-white navbar navbar-expand-md navbar-dark navbar-overlap d-print-none" data-bs-theme="dark">
      <div className="container-xl">
        {showNav && (
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbar-menu"
            aria-controls="navbar-menu"
            aria-expanded="false"
            aria-label={t('HEADER_MAIN_NAVIGATION')}
          >
            <span className="navbar-toggler-icon" />
          </button>
        )}
        <Link to="/dashboard">
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
              <a href="https://github.com/runtipi/runtipi" target="_blank" rel="noreferrer" className="btn btn-ghost">
                <IconBrandGithub data-testid="icon-github" className="me-1 icon" size={24} />
                {t('HEADER_SOURCE_CODE')}
              </a>
              <a href="https://github.com/runtipi/runtipi?sponsor=1" target="_blank" rel="noreferrer" className="btn btn-ghost">
                <IconHeart className="me-1 icon text-pink" size={24} />
                {t('HEADER_SPONSOR')}
              </a>
            </div>
          </div>
          <div style={{ zIndex: 1 }} className="d-flex">
            {showCertificateButton && (
              <>
                <Tooltip className="tooltip" anchorSelect=".downloadCert">
                  {t('GUEST_DASHBOARD_DOWNLOAD_CERTIFICATE_TOOLTIP')}
                </Tooltip>
                <button
                  type="button"
                  onClick={downloadCertificate}
                  className="downloadCert nav-link px-0 cursor-pointer"
                  data-testid="download-certificate-button"
                >
                  <IconCertificate size={20} />
                </button>
              </>
            )}
            <Tooltip className="tooltip" anchorSelect=".themeMode">
              {themeTooltip}
            </Tooltip>
            <button
              type="button"
              onClick={handleThemeToggle}
              className="themeMode nav-link px-0 cursor-pointer"
              data-testid="theme-toggle"
              aria-label={themeTooltip}
            >
              {themeMode === 'dark' && <IconMoon data-testid="icon-moon" size={20} />}
              {themeMode === 'light' && <IconSun data-testid="icon-sun" size={20} />}
              {themeMode === 'system' && <IconSunMoon data-testid="icon-system" size={20} />}
            </button>
            <Tooltip className="tooltip" anchorSelect=".logOut">
              {isLoggedIn ? t('HEADER_LOGOUT') : t('HEADER_LOGIN')}
            </Tooltip>
            <button
              type="button"
              onClick={handleLogoutClick}
              disabled={logoutDisabled}
              aria-disabled={logoutDisabled}
              tabIndex={0}
              className={clsx('logOut nav-link px-0 cursor-pointer', { disabled: logoutDisabled })}
              data-testid="logout-button"
            >
              {isLoggedIn ? <IconLogout size={20} /> : <IconLogin size={20} />}
            </button>
          </div>
        </div>
        {navbarContent}
      </div>
    </header>
  );
};
