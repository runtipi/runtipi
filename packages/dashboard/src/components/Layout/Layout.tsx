import Head from 'next/head';
import Link from 'next/link';
import React, { useEffect } from 'react';
import clsx from 'clsx';
import ReactTooltip from 'react-tooltip';
import { useRefreshTokenQuery } from '../../generated/graphql';
import { Header } from '../ui/Header';
import styles from './Layout.module.scss';

interface IProps {
  loading?: boolean;
  breadcrumbs?: { name: string; href: string; current?: boolean }[];
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

export const Layout: React.FC<IProps> = ({ children, breadcrumbs, title, actions }) => {
  const { data } = useRefreshTokenQuery({ fetchPolicy: 'network-only' });

  useEffect(() => {
    if (data?.refreshToken?.token) {
      localStorage.setItem('token', data.refreshToken.token);
    }
  }, [data?.refreshToken?.token]);

  const renderBreadcrumbs = () => {
    if (!breadcrumbs) {
      return null;
    }

    return (
      <ol className="breadcrumb" aria-label="breadcrumbs">
        {breadcrumbs.map((breadcrumb) => (
          <li key={breadcrumb.name} className={clsx('breadcrumb-item', { active: breadcrumb.current })}>
            <Link href={breadcrumb.href}>{breadcrumb.name}</Link>
          </li>
        ))}
      </ol>
    );
  };

  return (
    <div className="page">
      <Head>
        <title>{title} - Tipi</title>
      </Head>
      <ReactTooltip offset={{ right: 3 }} effect="solid" place="bottom" />
      <Header />
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
