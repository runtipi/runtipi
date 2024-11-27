import { useUIStore } from '@/stores/ui-store';
import type { AppInfoSimple } from '@/types/app.types';
import clsx from 'clsx';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

type Props = {
  apps: AppInfoSimple[];
};

export const PageTitle = ({ apps }: Props) => {
  const { t } = useTranslation();
  const activeRoute = useUIStore((state) => state.activeRoute);

  const path = window.location.pathname;
  // biome-ignore lint/correctness/useExhaustiveDependencies: Explicitly ignore this rule to re-render the component when the activeRoute changes
  const pathArray = useMemo(() => path?.substring(1).split('/') || [], [activeRoute]);

  const renderBreadcrumbs = () => {
    return (
      <ol className="breadcrumb" aria-label="breadcrumbs">
        {pathArray.map((breadcrumb, index) => (
          <li key={breadcrumb} className={clsx('breadcrumb-item', { active: index === pathArray.length - 1 })}>
            <Link to={`/${pathArray.slice(0, index + 1).join('/')}`}>{breadcrumb}</Link>
          </li>
        ))}
      </ol>
    );
  };

  const appTitle = apps.find((app) => app.id === pathArray[1])?.name;
  const title = appTitle ?? t(`HEADER_${pathArray[pathArray.length - 1]?.toUpperCase().replace('-', '_')}`);

  return (
    <>
      <div className="page-pretitle">{renderBreadcrumbs()}</div>
      <h2 className="page-title mt-1">{title}</h2>
    </>
  );
};
