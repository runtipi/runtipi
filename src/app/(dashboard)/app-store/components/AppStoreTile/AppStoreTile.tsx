'use client';

import { AppLogo } from '@/components/AppLogo';
import { limitText } from '@/lib/helpers/text-helpers';
import type { AppCategory } from '@runtipi/shared';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type React from 'react';
import type { MouseEvent } from 'react';
import { colorSchemeForCategory } from '../../helpers/table.helpers';
import styles from './AppStoreTile.module.scss';

type App = {
  id: string;
  name: string;
  categories: AppCategory[];
  created_at: number;
  short_desc: string;
};

export const AppStoreTile: React.FC<{ app: App; onClickCategory: (category: AppCategory) => void }> = ({ app, onClickCategory }) => {
  const t = useTranslations();
  const isNew = app.created_at + 14 * 24 * 60 * 60 * 1000 > Date.now();

  const handleClick = (category: AppCategory) => {
    return (event: MouseEvent) => {
      event.preventDefault();
      onClickCategory(category);
    };
  };

  return (
    <Link aria-label={app.name} className={clsx(styles.appTile)} href={`/app-store/${app.id}`} passHref>
      <div key={app.id} className="d-flex overflow-hidden align-items-center py-2 ps-2">
        <AppLogo className={styles.logo} id={app.id} />
        <div className="card-body">
          <div className="d-flex align-items-center" style={{ columnGap: '0.75rem' }}>
            <h3 className="text-bold h-3 mb-2">{limitText(app.name, 20)}</h3>
            {isNew ? <div className="text-white badge me-1 bg-green">{t('APP_NEW')}</div> : null}
          </div>
          <p className="text-muted text-nowrap mb-2">{limitText(app.short_desc, 30)}</p>
          {app.categories?.map((category) => (
            <button
              className={`text-white badge me-1 bg-${colorSchemeForCategory[category]}`}
              key={`${app.id}-${category}`}
              onClick={handleClick(category)}
              type="button"
            >
              {t(`APP_CATEGORY_${category.toUpperCase() as Uppercase<typeof category>}`)}
            </button>
          ))}
        </div>
      </div>
    </Link>
  );
};
