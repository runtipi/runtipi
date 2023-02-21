import Head from 'next/head';
import Link from 'next/link';
import React, { useEffect } from 'react';
import clsx from 'clsx';
import ReactTooltip from 'react-tooltip';
import semver from 'semver';
import { useRouter } from 'next/router';
import { Header } from '../ui/Header';
import styles from './Layout.module.scss';
import { useSystemStore } from '../../state/systemStore';
import { trpc } from '../../utils/trpc';

interface IProps {
  loading?: boolean;
  breadcrumbs?: { name: string; href: string; current?: boolean }[];
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

export const Layout: React.FC<IProps> = ({ children, breadcrumbs, title, actions }) => {
  const router = useRouter();
  const refreshToken = trpc.auth.refreshToken.useMutation({
    onSuccess: (data) => {
      if (data?.token) localStorage.setItem('token', data.token);
    },
    onError: () => {
      localStorage.removeItem('token');
      router.push('/login');
    },
  });

  useEffect(() => {
    refreshToken.mutate();
  }, []);

  const { version } = useSystemStore();
  const defaultVersion = '0.0.0';
  const isLatest = semver.gte(version?.current || defaultVersion, version?.latest || defaultVersion);

  const renderBreadcrumbs = () => {
    if (!breadcrumbs) {
      return null;
    }

    return (
      <ol className="breadcrumb" aria-label="breadcrumbs">
        {breadcrumbs.map((breadcrumb) => (
          <li key={breadcrumb.name} data-testid="breadcrumb-item" className={clsx('breadcrumb-item', { active: breadcrumb.current })}>
            <Link data-testid="breadcrumb-link" href={breadcrumb.href}>
              {breadcrumb.name}
            </Link>
          </li>
        ))}
      </ol>
    );
  };

  return (
    <div data-testid={`${title?.toLowerCase().split(' ').join('-')}-layout`} className="page">
      <Head>
        <title>{`${title} - Tipi`}</title>
      </Head>
      <ReactTooltip offset={{ right: 1 }} effect="solid" place="bottom" />
      <Header isUpdateAvailable={!isLatest} />
      <div className="page-wrapper">
        <div className="page-header d-print-none">
          <div className="container-xl">
            <div className={clsx('align-items-stretch align-items-md-center d-flex flex-column flex-md-row ', styles.topActions)}>
              <div className="me-3 text-white">
                <div className="page-pretitle">{renderBreadcrumbs()}</div>
                <h2 className="page-title">{title}</h2>
              </div>
              <div className="flex-fill">{actions}</div>
            </div>
          </div>
        </div>
        <div className="page-body">
          <div className="container-xl">{children}</div>
        </div>
      </div>
    </div>
  );
};
