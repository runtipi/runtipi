'use client';

import React from 'react';
import { IconAlertCircle, IconDownload } from '@tabler/icons-react';
import { Tooltip } from 'react-tooltip';
import { useTranslations } from 'next-intl';
import type { AppInfo } from '@runtipi/shared';
import { AppLogo } from '@/components/AppLogo';
import { AppStatus } from '@/components/AppStatus';
import { limitText } from '@/lib/helpers/text-helpers';
import styles from './AppTile.module.scss';

type AppTileInfo = Pick<AppInfo, 'id' | 'name' | 'description' | 'short_desc' | 'deprecated'>;

export const AppTile: React.FC<{ app: AppTileInfo; updateAvailable: boolean }> = ({ app, updateAvailable }) => {
  const t = useTranslations();

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
                  <AppStatus lite appId={app.id} />
                </div>
              </div>
              <div className="text-muted">{limitText(app.short_desc, 50)}</div>
            </div>
          </div>
        </div>
        {updateAvailable && (
          <>
            <Tooltip className="tooltip" anchorSelect=".updateAvailable">
              {t('MY_APPS_UPDATE_AVAILABLE')}
            </Tooltip>
            <div className="updateAvailable ribbon bg-green ribbon-top">
              <IconDownload size={20} />
            </div>
          </>
        )}
        {app.deprecated && (
          <>
            <Tooltip className="tooltip" anchorSelect=".deprecated">
              {t('MY_APPS_DEPRECATED')}
            </Tooltip>
            <div className="deprecated ribbon bg-red ribbon-top">
              <IconAlertCircle />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
