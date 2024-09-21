'use client';

import { IconBrandGithub, IconHeart, IconLogin, IconLogout, IconMoon, IconSun } from '@tabler/icons-react';
import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import type React from 'react';

import { logoutAction } from '@/actions/logout/logout-action';
import { useUIStore } from '@/client/state/uiStore';
import { useClientSettings } from '@/hooks/useClientSettings';
import { getLogo } from '@/lib/themes';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { Tooltip } from 'react-tooltip';
import { NavBar } from '../NavBar';

interface IProps {
  isUpdateAvailable?: boolean;
  authenticated?: boolean;
}

export const Header: React.FC<IProps> = ({ isUpdateAvailable, authenticated = true }) => {
  const { setDarkMode } = useUIStore();
  const t = useTranslations();
  const { allowAutoThemes = false } = useClientSettings();

  const router = useRouter();

  const logoutMutation = useAction(logoutAction, {
    onSuccess: () => {
      router.push('/');
    },
  });

  const logHandler = () => {
    if (authenticated) {
      logoutMutation.execute();
    } else {
      router.push('/login');
    }
  };

  return (
    <header className="text-white navbar navbar-expand-md navbar-dark navbar-overlap d-print-none" data-bs-theme="dark">
      <Script src="/js/tabler.min.js" async />
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
              src={getLogo(allowAutoThemes)}
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
              {authenticated ? t('HEADER_LOGOUT') : t('HEADER_LOGIN')}
            </Tooltip>
            <button
              type="button"
              onClick={() => logHandler()}
              tabIndex={0}
              className="logOut nav-link px-0 cursor-pointer"
              data-testid="logout-button"
            >
              {authenticated ? <IconLogout size={20} /> : <IconLogin size={20} />}
            </button>
          </div>
        </div>
        <NavBar isUpdateAvailable={isUpdateAvailable} />
      </div>
    </header>
  );
};
