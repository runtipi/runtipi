import Link from 'next/link';
import React from 'react';
import { IconDownload } from '@tabler/icons';
import { AppStatus } from '../AppStatus';
import { AppLogo } from '../AppLogo/AppLogo';
import { limitText } from '../../modules/AppStore/helpers/table.helpers';
import { AppInfo, AppStatusEnum } from '../../generated/graphql';
import styles from './AppTile.module.scss';

type AppTileInfo = Pick<AppInfo, 'id' | 'name' | 'description' | 'short_desc'>;

export const AppTile: React.FC<{ app: AppTileInfo; status: AppStatusEnum; updateAvailable: boolean }> = ({ app, status, updateAvailable }) => (
  <div className="col-sm-6 col-lg-4">
    <div className="card card-sm card-link">
      <Link href={`/apps/${app.id}`} className="nav-link" passHref>
        <div className="card-body">
          <div className="d-flex align-items-center">
            <span className="me-3">
              <AppLogo alt={`${app.name} logo`} className="mr-3 group-hover:scale-105 transition-all" id={app.id} size={60} />
            </span>
            <div>
              <div className="d-flex h-3 align-items-center">
                <span className="h4 me-2 mt-1 fw-bolder">{app.name}</span>
                <div className={styles.statusContainer}>
                  <AppStatus lite status={status} />
                </div>
              </div>
              <div className="text-muted">{limitText(app.short_desc, 50)}</div>
            </div>
          </div>
        </div>
        {updateAvailable && (
          <div data-tip="Update available" className="ribbon bg-green ribbon-top">
            <IconDownload />
          </div>
        )}
      </Link>
    </div>
  </div>
);
