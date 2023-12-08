'use client';

import React from 'react';
import { IconDownload } from '@tabler/icons-react';
import { Tooltip } from 'react-tooltip';
import type { AppStatus as AppStatusEnum } from '@/server/db/schema';
import { useTranslations } from 'next-intl';
import type { AppInfo } from '@runtipi/shared';
import { AppLogo } from '@/components/AppLogo';
import { AppStatus } from '@/components/AppStatus';
import { limitText } from '@/lib/helpers/text-helpers';
import styles from './AppTile.module.scss';

type AppTileInfo = Pick<AppInfo, 'id' | 'name' | 'description' | 'short_desc'>;

export const AppTile: React.FC<{ app: AppTileInfo; status: AppStatusEnum; updateAvailable: boolean }> = ({ app, status, updateAvailable }) => {
  const t = useTranslations('apps');

  return (
    <div data-testid={`app-tile-${app.id}`}>
      <div className="card card-sm card-link">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <span className="me-3">
              <AppLogo alt={`${app.name} logo`} id={app.id} size={60} />
            </span>
            <div>
              <div className="d-flex h-3 align-items-center">
                <span className="h4 me-2 mb-1 fw-bolder">{app.name}</span>
                <div className={styles.statusContainer}>
                  <AppStatus lite status={status} />
                </div>
              </div>
              <div className="text-muted">{limitText(app.short_desc, 50)}</div>
            </div>
          </div>
        </div>
        {updateAvailable && (
          <>
            <Tooltip className="tooltip" anchorSelect=".updateAvailable">
              {t('update-available')}
            </Tooltip>
            <div className="updateAvailable ribbon bg-green ribbon-top">
              <IconDownload size={20} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
