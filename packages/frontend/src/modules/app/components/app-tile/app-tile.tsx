import { AppLogo } from '@/components/app-logo/app-logo';
import { limitText } from '@/lib/helpers/text-helpers';
import type { AppInfo, AppStatus as AppStatusType } from '@/types/app.types';
import { IconAlertCircle, IconDownload, IconRotateClockwise } from '@tabler/icons-react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';
import { AppStatus } from '../app-status/app-status';
import './app-tile.css';

type AppTileInfo = Pick<AppInfo, 'urn' | 'name' | 'short_desc' | 'deprecated'>;

export const AppTile: React.FC<{
  info: AppTileInfo;
  status: AppStatusType;
  updateAvailable: boolean;
  pendingRestart?: boolean;
}> = ({ info, status, updateAvailable, pendingRestart }) => {
  const { t } = useTranslation();

  var badge = null;

  // Using if-else sets the badge once while rendering them in the return causes badges to stack
  if (pendingRestart) {
    badge = (
      <>
        <Tooltip className="tooltip" anchorSelect=".pendingRestart">
          {t('MY_APPS_PENDING_RESTART')}
        </Tooltip>
        <div className="pendingRestart ribbon bg-warning ribbon-top">
          <IconRotateClockwise size={20} />
        </div>
      </>
    );
  } else if (updateAvailable) {
    badge = (
      <>
        <Tooltip className="tooltip" anchorSelect=".updateAvailable">
          {t('MY_APPS_UPDATE_AVAILABLE')}
        </Tooltip>
        <div className="updateAvailable ribbon bg-green ribbon-top">
          <IconDownload size={20} />
        </div>
      </>
    );
  } else if (info.deprecated) {
    badge = (
      <>
        <Tooltip className="tooltip" anchorSelect=".deprecated">
          {t('MY_APPS_DEPRECATED')}
        </Tooltip>
        <div className="deprecated ribbon bg-red ribbon-top">
          <IconAlertCircle />
        </div>
      </>
    );
  }

  return (
    <div className="card card-sm card-link">
      <div className="card-body d-flex gap-3 d-flex align-items-center">
        <AppLogo alt={`${info.name} logo`} urn={info.urn} size={60} />
        <div className="d-flex flex-column justify-items-center">
          <div className="d-flex align-items-center gap-2">
            <span className="fw-bolder">{info.name}</span>
            <AppStatus lite status={status} />
          </div>
          <div className="text-muted">{limitText(info.short_desc, 50)}</div>
        </div>
      </div>
      {badge}
    </div>
  );
};
