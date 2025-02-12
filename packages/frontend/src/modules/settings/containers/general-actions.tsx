import { Markdown } from '@/components/markdown/markdown';
import { Button } from '@/components/ui/Button';
import { useAppContext } from '@/context/app-context';
import { IconStar } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import semver from 'semver';
import { UpdateRepoModal } from '../components/update-repo-modal/update-repo-modal';
import { UpdateModal } from '../components/update-modal/update-modal';

export const GeneralActionsContainer = () => {
  const { t } = useTranslation();
  const { version } = useAppContext();

  const isLatest = semver.valid(version.current) && semver.valid(version.latest) && semver.gte(version.current, version.latest);

  const renderUpdate = () => {
    if (isLatest) {
      return <Button disabled>{t('SETTINGS_ACTIONS_ALREADY_LATEST')}</Button>;
    }

    return (
      <div>
        {version.body && (
          <div className="mt-3 card col-12 col-md-8">
            <div className="card-stamp">
              <div className="card-stamp-icon bg-yellow">
                <IconStar size={80} />
              </div>
            </div>
            <div className="card-body">
              <Markdown className="" content={version.body} />
            </div>
          </div>
        )}
        <UpdateModal version={version.current} latest={version.latest} />
      </div>
    );
  };

  return (
    <div className="card-body">
      <h2 className="mb-4">{t('SETTINGS_ACTIONS_TITLE')}</h2>
      <h3 className="card-title mt-4">{t('SETTINGS_ACTIONS_CURRENT_VERSION', { version: version.current })}</h3>
      <p className="card-subtitle">
        {isLatest ? t('SETTINGS_ACTIONS_STAY_UP_TO_DATE') : t('SETTINGS_ACTIONS_NEW_VERSION', { version: version.latest })}
      </p>
      {renderUpdate()}
      <h3 className="card-title mt-4">{t('SETTINGS_ACTIONS_UPDATE_REPO_TITLE')}</h3>
      <p className="card-subtitle">{t('SETTINGS_ACTIONS_UPDATE_REPO_SUBTITLE')}</p>
      <UpdateRepoModal />
    </div>
  );
};
