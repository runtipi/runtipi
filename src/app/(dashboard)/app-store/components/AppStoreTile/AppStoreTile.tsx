'use client';

import { AppLogo } from '@/components/AppLogo';
import { limitText } from '@/lib/helpers/text-helpers';
import type { AppCategory } from '@runtipi/shared';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type React from 'react';
import { colorSchemeForCategory } from '../../helpers/table.helpers';
import styles from './AppStoreTile.module.scss';

type App = {
  id: string;
  name: string;
  categories: AppCategory[];
  short_desc: string;
};

export const AppStoreTile: React.FC<{ app: App }> = ({ app }) => {
  const t = useTranslations();

  return (
    <Link aria-label={app.name} className={clsx(styles.appTile)} href={`/app-store/${app.id}`} passHref>
      <div key={app.id} className="d-flex overflow-hidden align-items-center py-2 ps-2">
        <AppLogo className={styles.logo} id={app.id} />
        <div className="card-body">
          <h3 className="text-bold h-3 mb-2">{limitText(app.name, 20)}</h3>
          <p className="text-muted text-nowrap mb-2">{limitText(app.short_desc, 30)}</p>
          {app.categories?.map((category) => (
            <div className={`text-white badge me-1 bg-${colorSchemeForCategory[category]}`} key={`${app.id}-${category}`}>
              {t(`APP_CATEGORY_${category.toUpperCase() as Uppercase<typeof category>}`)}
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
};
