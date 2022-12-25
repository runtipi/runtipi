import clsx from 'clsx';
import Link from 'next/link';
import React from 'react';
import { AppLogo } from '../../../../components/AppLogo/AppLogo';
import { AppCategoriesEnum } from '../../../../generated/graphql';
import { colorSchemeForCategory, limitText } from '../../helpers/table.helpers';
import styles from './AppStoreTile.module.scss';

type App = {
  id: string;
  name: string;
  categories: string[];
  short_desc: string;
};

const AppStoreTile: React.FC<{ app: App }> = ({ app }) => (
  <Link className={clsx('cursor-pointer col-sm-6 col-lg-4 p-2 mt-4', styles.appTile)} href={`/app-store/${app.id}`} passHref>
    <div key={app.id} className="d-flex overflow-hidden align-items-center py-2 ps-2">
      <AppLogo className={styles.logo} id={app.id} />
      <div className="card-body">
        <h3 className="text-bold h-3 mb-2">{limitText(app.name, 20)}</h3>
        <p className="text-muted text-nowrap mb-2">{limitText(app.short_desc, 30)}</p>
        {app.categories?.map((category) => (
          <div className={`badge me-1 bg-${colorSchemeForCategory[category as AppCategoriesEnum]}`} key={`${app.id}-${category}`}>
            {category.toLocaleLowerCase()}
          </div>
        ))}
      </div>
    </div>
  </Link>
);

export default AppStoreTile;
