import { IconApps, IconBrandAppstore, IconHome, IconSettings } from '@tabler/icons-react';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

interface IProps {
  isUpdateAvailable?: boolean;
}

export const NavBar: React.FC<IProps> = ({ isUpdateAvailable }) => {
  const t = useTranslations();
  const path = usePathname()?.split('/')[1];

  const renderItem = (title: string, name: string, IconComponent: typeof IconApps) => {
    const isActive = path === name;
    const itemClass = clsx('nav-item', { active: isActive, 'border-primary': isActive, 'border-bottom-wide': isActive });

    return (
      <li aria-label={title} data-testid={`nav-item-${name}`} className={itemClass}>
        <Link href={`/${name}`} className="nav-link" passHref>
          <span className="nav-link-icon d-md-none d-lg-inline-block">
            <IconComponent size={24} />
          </span>
          <span className="nav-link-title">{title}</span>
        </Link>
      </li>
    );
  };

  return (
    <div id="navbar-menu" className="collapse navbar-collapse">
      <div className="d-flex flex-column flex-md-row flex-fill align-items-stretch align-items-md-center">
        <ul className="navbar-nav">
          {renderItem(t('HEADER_DASHBOARD'), 'dashboard', IconHome)}
          {renderItem(t('HEADER_APPS'), 'apps', IconApps)}
          {renderItem(t('HEADER_APP_STORE'), 'app-store', IconBrandAppstore)}
          {renderItem(t('HEADER_SETTINGS'), 'settings', IconSettings)}
        </ul>
        {Boolean(isUpdateAvailable) && <span className="ms-2 badge text-white bg-green d-none d-lg-block">{t('HEADER_UPDATE_AVAILABLE')}</span>}
      </div>
    </div>
  );
};
