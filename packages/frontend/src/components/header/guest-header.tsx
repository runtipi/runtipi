import { getLogo } from '@/lib/theme/theme';
import { useUIStore } from '@/stores/ui-store';
import { IconBrandGithub, IconCertificate, IconHeart, IconLogin, IconMoon, IconSun } from '@tabler/icons-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { Tooltip } from 'react-tooltip';

export const GuestHeader = () => {
  const setDarkMode = useUIStore((state) => state.setDarkMode);
  const theme = useUIStore((state) => state.theme);

  const { t } = useTranslation();

  const navigate = useNavigate();

  const downloadCertificate = () => {
    window.open('/api/system/certificate');
  };

  return (
    <header className="text-white navbar navbar-expand-md navbar-dark navbar-overlap d-print-none" data-bs-theme="dark">
      <div className="container-xl">
        <Link to="/">
          <h1 className="navbar-brand d-none-navbar-horizontal pe-0 pe-md-3">
            <img
              alt="Runtipi logo"
              className="navbar-brand-image me-3"
              width={100}
              height={100}
              src={getLogo(true)}
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
            <Tooltip className="tooltip" anchorSelect=".darkMode">
              {t('HEADER_DARK_MODE')}
            </Tooltip>
            <button
              type="button"
              onClick={() => setDarkMode(true)}
              className={clsx('darkMode nav-link px-0 cursor-pointer', {
                'visually-hidden': theme === 'dark',
              })}
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
              className={clsx('lightMode nav-link px-0 cursor-pointer ', {
                'visually-hidden': theme === 'light',
              })}
              data-testid="light-mode-toggle"
            >
              <IconSun data-testid="icon-sun" size={20} />
            </button>
            <Tooltip className="tooltip" anchorSelect=".logOut">
              {t('HEADER_LOGIN')}
            </Tooltip>
            <button
              type="button"
              onClick={() => navigate('/login')}
              tabIndex={0}
              className="logOut nav-link px-0 cursor-pointer"
              data-testid="logout-button"
            >
              <IconLogin size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
