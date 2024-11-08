'use client';

import type { MessageKey } from '@/server/utils/errors';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type Props = {
  apps: { id: string; name: string }[];
};

export const PageTitle = ({ apps }: Props) => {
  const t = useTranslations();

  const path = usePathname();

  const pathArray = useMemo(() => path?.substring(1).split('/') || [], [path]);

  const renderBreadcrumbs = () => {
    return (
      <ol className="breadcrumb" aria-label="breadcrumbs">
        {pathArray.map((breadcrumb, index) => (
          <li key={breadcrumb} className={clsx('breadcrumb-item', { active: index === pathArray.length - 1 })}>
            <Link href={`/${pathArray.slice(0, index + 1).join('/')}`}>{breadcrumb}</Link>
          </li>
        ))}
      </ol>
    );
  };

  const appTitle = apps.find((app) => app.id === pathArray[1])?.name;
  const title = appTitle ?? t(`HEADER_${pathArray[pathArray.length - 1]?.toUpperCase().replace('-', '_')}` as MessageKey);

  return (
    <>
      <div className="page-pretitle">{renderBreadcrumbs()}</div>
      <h2 className="page-title mt-1">{title}</h2>
    </>
  );
};
