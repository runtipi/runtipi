import { AppLogo } from '@/components/app-logo/app-logo';
import { limitText } from '@/lib/helpers/text-helpers';
import type { AppInfo, AppStatus as AppStatusType } from '@/types/app.types';
import { IconAlertCircle, IconDownload, IconRotateClockwise } from '@tabler/icons-react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';
import { AppStatus } from '../app-status/app-status';

type AppTileInfo = Pick<AppInfo, 'urn' | 'name' | 'short_desc' | 'deprecated'>;

export const AppTile: React.FC<{
  info: AppTileInfo;
  status: AppStatusType;
  updateAvailable: boolean;
  pendingRestart?: boolean;
}> = ({ info, status, updateAvailable, pendingRestart }) => {
  const { t } = useTranslation();

  return (
    <div>
      <div className="card card-sm card-link">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <span className="me-3">
              <AppLogo alt={`${info.name} logo`} urn={info.urn} size={60} />
            </span>
            <div className="d-flex flex-column">
              <div className="d-flex h-3 align-items-center">
                <span className="h4 me-2 mb-1 fw-bolder">{info.name}</span>
                <div className="mb-1">
                  <AppStatus lite status={status} />
                </div>
              </div>
              <div className="text-muted">{limitText(info.short_desc, 50)}</div>
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
        {pendingRestart && (
          <>
            <Tooltip className="tooltip" anchorSelect=".pendingRestart">
              {t('MY_APPS_PENDING_RESTART')}
            </Tooltip>
            <div className="pendingRestart ribbon bg-warning ribbon-top">
              <IconRotateClockwise size={20} />
            </div>
          </>
        )}
        {info.deprecated && (
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
