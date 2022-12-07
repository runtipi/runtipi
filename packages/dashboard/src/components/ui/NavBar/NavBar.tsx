import { IconApps, IconBrandAppstore, IconHome, IconSettings, TablerIcon } from '@tabler/icons';
import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import semver from 'semver';
import { useVersionQuery } from '../../../generated/graphql';

export const NavBar: React.FC = () => {
  const { data } = useVersionQuery();
  const router = useRouter();
  const path = router.pathname.split('/')[1];
  const defaultVersion = '0.0.0';
  const isLatest = semver.gte(data?.version.current || defaultVersion, data?.version.latest || defaultVersion);

  const renderItem = (title: string, name: string, Icon: TablerIcon) => {
    const isActive = path === name;
    const itemClass = clsx('nav-item', { active: isActive, 'border-primary': isActive, 'border-bottom-wide': isActive });

    return (
      <li className={itemClass}>
        <Link href={`/${name}`} className="nav-link" passHref>
          <span className="nav-link-icon d-md-none d-lg-inline-block">
            <Icon size={24} />
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
          {renderItem('Dashboard', '', IconHome)}
          {renderItem('My Apps', 'apps', IconApps)}
          {renderItem('App Store', 'app-store', IconBrandAppstore)}
          {renderItem('Settings', 'settings', IconSettings)}
        </ul>
        {!isLatest && <span className="ms-2 badge bg-green d-none d-lg-block">Update available</span>}
      </div>
    </div>
  );
};
