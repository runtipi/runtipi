import { isRuntipiUpdateAvailable } from '@/components/layouts/app-shell/sidebar';
import { Markdown } from '@/components/markdown/markdown';
import { useAppContext } from '@/context/app-context';
import { IconCheck, IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsPanel } from '../components/settings-ui/settings-ui';
import { UpdateRepoModal } from '../components/update-repo-modal/update-repo-modal';

export const GeneralActionsContainer = () => {
  const { t } = useTranslation();
  const { version, refreshAppContext } = useAppContext();
  const [checking, setChecking] = useState(false);

  const updateAvailable = isRuntipiUpdateAvailable(version);

  const checkAgain = async () => {
    setChecking(true);
    try {
      await refreshAppContext();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="rt-settings-stack">
      <section className="rt-panel rt-version">
        <div className="rt-version__text">
          <div className="rt-eyebrow">{t('SETTINGS_RUNTIPI_VERSION')}</div>
          <div className="rt-version__number rt-display">v{version.current.replace(/^v/, '')}</div>
          <p>{updateAvailable ? t('SETTINGS_ACTIONS_NEW_VERSION', { version: version.latest }) : t('SETTINGS_ON_LATEST')}</p>
        </div>
        <div className="rt-version__actions">
          {updateAvailable ? (
            <span className="rt-status-pill rt-status-pill--warn">{t('SETTINGS_UPDATE_AVAILABLE', { version: version.latest })}</span>
          ) : (
            <span className="rt-status-pill">
              <IconCheck size={13} stroke={2.4} aria-hidden="true" />
              {t('DASHBOARD_SYSTEM_INFO_UP_TO_DATE')}
            </span>
          )}
          <button type="button" className="rt-btn" onClick={checkAgain} disabled={checking}>
            <IconRefresh size={15} stroke={1.8} className={checking ? 'rt-spin' : undefined} aria-hidden="true" />
            {t('SETTINGS_CHECK_AGAIN')}
          </button>
        </div>
      </section>

      {updateAvailable &&
        version.releases?.map((release) => (
          <SettingsPanel key={release.version} title={t('SETTINGS_RELEASE_TITLE', { version: release.version })}>
            <div className="rt-set-panel__body rt-release-notes">
              <Markdown className="" content={release.body} />
            </div>
          </SettingsPanel>
        ))}

      <SettingsPanel
        title={t('SETTINGS_ACTIONS_UPDATE_REPO_TITLE')}
        description={t('SETTINGS_ACTIONS_UPDATE_REPO_SUBTITLE')}
        action={<UpdateRepoModal />}
      />
    </div>
  );
};
