import React from 'react';
import { IconBrandGithub, IconHeart, IconLogout, IconMoon, IconSun } from '@tabler/icons-react';
import Image from 'next/image';
import clsx from 'clsx';
import Link from 'next/link';
import { Tooltip } from 'react-tooltip';
import { useTranslations } from 'next-intl';
import { useUIStore } from '../../../state/uiStore';
import { NavBar } from '../NavBar';

interface IProps {
  isUpdateAvailable?: boolean;
}

export const Header: React.FC<IProps> = ({ isUpdateAvailable }) => {
  const { setDarkMode } = useUIStore();
  const t = useTranslations('header');

  return (
    <header className="text-white navbar navbar-expand-md navbar-dark navbar-overlap d-print-none" data-bs-theme="dark">
      <div className="container-xl">
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-menu">
          <span className="navbar-toggler-icon" />
        </button>
        <Link href="/" passHref>
          <h1 className="navbar-brand d-none-navbar-horizontal pe-0 pe-md-3">
            <Image
              priority
              alt="Tipi logo"
              className={clsx('navbar-brand-image me-3')}
              width={100}
              height={100}
              src="/tipi.png"
              style={{
                width: '30px',
                maxWidth: '30px',
                height: 'auto',
              }}
            />
            Tipi
          </h1>
        </Link>
        <div className="navbar-nav flex-row order-md-last">
          <div className="nav-item d-none d-xl-flex me-3">
            <div className="btn-list">
              <a href="https://github.com/meienberger/runtipi" target="_blank" rel="noreferrer" className="btn btn-dark">
                <IconBrandGithub data-testid="icon-github" className="me-1 icon" size={24} />
                {t('source-code')}
              </a>
              <a href="https://github.com/meienberger/runtipi?sponsor=1" target="_blank" rel="noreferrer" className="btn btn-dark">
                <IconHeart className="me-1 icon text-pink" size={24} />
                {t('sponsor')}
              </a>
            </div>
          </div>
          <div style={{ zIndex: 1 }} className="d-flex">
            <Tooltip anchorSelect=".darkMode">{t('dark-mode')}</Tooltip>
            <div onClick={() => setDarkMode(true)} role="button" aria-hidden="true" className="darkMode nav-link px-0 hide-theme-dark cursor-pointer" data-testid="dark-mode-toggle">
              <IconMoon data-testid="icon-moon" size={20} />
            </div>
            <Tooltip anchorSelect=".lightMode">{t('light-mode')}</Tooltip>
            <div onClick={() => setDarkMode(false)} aria-hidden="true" className="lightMode nav-link px-0 hide-theme-light cursor-pointer" data-testid="light-mode-toggle">
              <IconSun data-testid="icon-sun" size={20} />
            </div>
            <Tooltip anchorSelect=".logOut">{t('logout')}</Tooltip>
            <div tabIndex={0} role="button" className="logOut nav-link px-0 cursor-pointer" data-testid="logout-button">
              <IconLogout size={20} />
            </div>
          </div>
        </div>
        <NavBar isUpdateAvailable={isUpdateAvailable} />
      </div>
    </header>
  );
};
