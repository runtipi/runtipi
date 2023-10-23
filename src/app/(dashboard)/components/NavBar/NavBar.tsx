import { IconApps, IconBrandAppstore, IconHome, IconSettings, Icon } from '@tabler/icons-react';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

interface IProps {
  isUpdateAvailable?: boolean;
}

export const NavBar: React.FC<IProps> = ({ isUpdateAvailable }) => {
  const t = useTranslations('header');
  const path = usePathname()?.split('/')[1];

  const renderItem = (title: string, name: string, IconComponent: Icon) => {
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
    <div id="navbar-menu" className="collapse navbar-collapse" style={{}}>
      <div className="d-flex flex-column flex-md-row flex-fill align-items-stretch align-items-md-center">
        <ul className="navbar-nav">
          {renderItem(t('dashboard'), 'dashboard', IconHome)}
          {renderItem(t('my-apps'), 'apps', IconApps)}
          {renderItem(t('app-store'), 'app-store', IconBrandAppstore)}
          {renderItem(t('settings'), 'settings', IconSettings)}
        </ul>
        {Boolean(isUpdateAvailable) && <span className="ms-2 badge text-white bg-green d-none d-lg-block">{t('update-available')}</span>}
      </div>
    </div>
  );
};
