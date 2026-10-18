import { rtCodeTheme } from '@/components/code-theme/code-theme';
import clsx from 'clsx';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import type { AppInfo } from '@/types/app.types';
import { IconInfoCircle, IconLock } from '@tabler/icons-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  disableUserConfigMutation,
  enableUserConfigMutation,
  getUserConfigOptions,
  updateUserConfigMutation,
} from '@/api-client/@tanstack/react-query.gen';
import toast from 'react-hot-toast';
import './app-user-config.css';
import type { TranslatableError } from '@/types/error.types';

interface AppUserConfigProps {
  info: AppInfo;
  initialDockerCompose?: string;
  initialAppEnv?: string;
  initialSourceCompose?: string;
  initialIsEnabled?: boolean;
}

export const AppUserConfig = (props: AppUserConfigProps) => {
  const { info } = props;

  const { data } = useSuspenseQuery({
    ...getUserConfigOptions({ path: { urn: info.urn } }),
  });

  return (
    <AppUserConfigEditors
      info={info}
      initialAppEnv={data.appEnv || ''}
      initialDockerCompose={data.dockerCompose || ''}
      initialSourceCompose={data.sourceCompose || ''}
      initialIsEnabled={data.isEnabled}
    />
  );
};

export const AppUserConfigEditors = ({ info, initialAppEnv, initialDockerCompose, initialSourceCompose, initialIsEnabled }: AppUserConfigProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'docker-compose' | 'overrides'>('docker-compose');

  const [dockerCompose, setDockerCompose] = useState(initialDockerCompose ?? '');

  const placeholder = `# Add your docker-compose overrides here.
# For example, to add a new environment variable to the main service:
#
# services:
#   main:
#     environment:
#       - MY_VAR=my-value
#
# The overrides will be merged with the generated docker-compose.yml file.
`;

  const appEnv = initialAppEnv ?? '';
  const [isEnabled, setIsEnabled] = useState(initialIsEnabled ?? true);

  const updateMutation = useMutation({
    ...updateUserConfigMutation(),
    onSuccess: () => {
      toast.success(t('USER_CONFIG_UPDATE_SUCCESS'));
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const enableMutation = useMutation({
    ...enableUserConfigMutation(),
    onSuccess: () => {
      setIsEnabled(true);
    },
  });

  const disableMutation = useMutation({
    ...disableUserConfigMutation(),
    onSuccess: () => {
      setIsEnabled(false);
    },
  });

  const handleToggleEnabled = (checked: boolean) => {
    if (checked) {
      enableMutation.mutate({ path: { urn: info.urn } });
    } else {
      disableMutation.mutate({ path: { urn: info.urn } });
    }
  };

  const handleSave = () => {
    updateMutation.mutate({ path: { urn: info.urn }, body: { dockerCompose: dockerCompose.trimEnd(), appEnv: appEnv.trimEnd() } });
  };

  const isDirty = dockerCompose !== (initialDockerCompose ?? '');

  return (
    <section className="rt-panel rt-files" aria-labelledby="rt-files-title">
      <div className="rt-files__head">
        <h2 id="rt-files-title" className="rt-appd-h2">
          {t('APP_FILES_TAB_TITLE')}
        </h2>
        <div className="rt-seg rt-seg--sm" role="tablist" aria-label={t('APP_PAGE_FILE')}>
          {(['docker-compose', 'overrides'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={clsx('rt-seg__btn', { 'is-on': activeTab === tab })}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'docker-compose' ? 'docker-compose.yml' : t('USER_CONFIG_OVERRIDES_TAB_TITLE')}
            </button>
          ))}
        </div>
      </div>

      <div className="rt-files__warning" role="note">
        <IconInfoCircle size={18} stroke={1.8} />
        <span>{t('USER_CONFIG_WARNING_DESCRIPTION')}</span>
      </div>

      {activeTab === 'docker-compose' ? (
        <>
          <div className="rt-files__note">
            <IconLock size={14} stroke={1.8} />
            {t('APP_PAGE_FILES_READONLY')}
          </div>
          <CodeMirror
            readOnly
            editable={false}
            value={initialSourceCompose}
            height="440px"
            extensions={[yaml(), rtCodeTheme]}
            theme="none"
            basicSetup={{ foldGutter: false }}
          />
        </>
      ) : (
        <>
          <div className="rt-files__toggle">
            <button
              type="button"
              role="switch"
              id="rt-files-enable"
              className="rt-switch"
              aria-checked={isEnabled}
              aria-labelledby="rt-files-enable-label"
              disabled={enableMutation.isPending || disableMutation.isPending}
              onClick={() => handleToggleEnabled(!isEnabled)}
            />
            <span id="rt-files-enable-label">{t('USER_CONFIG_ENABLE')}</span>
          </div>
          <CodeMirror
            readOnly={!isEnabled}
            value={dockerCompose}
            placeholder={placeholder}
            height="320px"
            extensions={[yaml(), rtCodeTheme]}
            theme="none"
            basicSetup={{ foldGutter: false }}
            onChange={(value) => setDockerCompose(value)}
            aria-label={t('USER_CONFIG_OVERRIDES_TAB_TITLE')}
          />
          <p className="rt-files__note rt-files__note--merge">
            <Trans
              t={t}
              i18nKey="USER_CONFIG_DOCKER_MERGE_DESCRIPTION"
              components={{
                // biome-ignore lint/a11y/useAnchorContent: not applicable
                a: <a target="_blank" rel="noopener" href="https://docs.docker.com/reference/compose-file/merge/" />,
                code: <code />,
              }}
            />
          </p>
          <div className="rt-files__footer">
            <button type="button" className="rt-btn" disabled={!isDirty} onClick={() => setDockerCompose(initialDockerCompose ?? '')}>
              {t('SETTINGS_DISCARD')}
            </button>
            <button type="button" className="rt-btn rt-btn--primary" disabled={updateMutation.isPending || !isEnabled} onClick={handleSave}>
              {t('SAVE')}
            </button>
          </div>
        </>
      )}
    </section>
  );
};
