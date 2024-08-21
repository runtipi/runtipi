'use client';

import { Markdown } from '@/components/Markdown';
import { Button } from '@/components/ui/Button';
import { IconStar } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import semver from 'semver';

type Props = { version: { current: string; latest: string; body?: string | null } };

export const GeneralActions = (props: Props) => {
  const t = useTranslations();
  const { version } = props;

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
              <Markdown className="">{version.body}</Markdown>
            </div>
          </div>
        )}
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
    </div>
  );
};
