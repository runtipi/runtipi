import { updateAppMetadataMutation } from '@/api-client/@tanstack/react-query.gen';
import { getCategoryTint } from '@/components/app-icon/app-icon';
import type { AppDetails, AppInfo, AppMetadata } from '@/types/app.types';
import { CURRENT_SCHEMA_VERSION } from '@runtipi/common/schemas';
import { IconAlertCircle, IconAlertTriangle } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { Suspense, lazy, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const AppDescriptionEditor = lazy(() =>
  import('../app-description-editor/app-description-editor').then((module) => ({ default: module.AppDescriptionEditor })),
);

export const AppCategoryChip = ({ category }: { category: AppInfo['categories'][number] }) => {
  const { t } = useTranslation();

  return (
    <span className={clsx('rt-appd-chip rt-appd-chip--cat', `rt-cat--${getCategoryTint([category])}`)}>
      {t(`APP_CATEGORY_${category.toUpperCase() as Uppercase<typeof category>}`)}
    </span>
  );
};

/** Deprecation and outdated compose schema warnings */
export const AppAlerts = ({ info, metadata }: { info: AppInfo; metadata?: AppMetadata }) => {
  const { t } = useTranslation();
  const schemaVersion = metadata?.composeSchemaVersion;
  const schemaOutdated = schemaVersion !== undefined && schemaVersion < CURRENT_SCHEMA_VERSION;

  if (!info.deprecated && !schemaOutdated) return null;

  return (
    <div className="rt-appd-alerts">
      {info.deprecated && (
        <div className="rt-appd-alert rt-appd-alert--danger" role="alert">
          <IconAlertCircle size={18} stroke={1.8} />
          <div>
            <strong>{t('APP_DETAILS_DEPRECATED_ALERT_TITLE')}</strong>
            <p>{t('APP_DETAILS_DEPRECATED_ALERT_SUBTITLE')}</p>
          </div>
        </div>
      )}
      {schemaOutdated && (
        <div className="rt-appd-alert" role="alert">
          <IconAlertTriangle size={18} stroke={1.8} />
          <div>
            <strong>{t('APP_COMPOSE_SCHEMA_OUTDATED_ALERT_TITLE')}</strong>
            <p>{t('APP_COMPOSE_SCHEMA_OUTDATED_ALERT_SUBTITLE', { version: schemaVersion })}</p>
          </div>
        </div>
      )}
    </div>
  );
};

/** The app description, or the editable notes of a custom app */
export const AppAboutPanel = ({ info, isUserApp }: { info: AppInfo; isUserApp: boolean }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [meta, setMeta] = useState(info.description);

  const saveMetaMutation = useMutation({
    ...updateAppMetadataMutation(),
    onSuccess: () => {
      setIsEditing(false);
      toast.success(t('APP_NOTES_SAVE_SUCCESS'));
    },
    onError: () => {
      toast.error(t('APP_ERROR_SAVE_NOTES'));
    },
  });

  return (
    <section className="rt-panel rt-appd-about" aria-labelledby="rt-appd-about-title">
      <div className="rt-appd-about__head">
        <h2 id="rt-appd-about-title" className="rt-appd-h2">
          {isUserApp ? t('APP_DETAILS_NOTES') : t('APP_PAGE_ABOUT')}
        </h2>
        {isUserApp && !isEditing && (
          <button type="button" className="rt-btn rt-btn--sm" onClick={() => setIsEditing(true)}>
            {t('EDIT')}
          </button>
        )}
        {isUserApp && isEditing && (
          <div className="rt-appd-about__actions">
            <button
              type="button"
              className="rt-btn rt-btn--sm"
              onClick={() => {
                setIsEditing(false);
                setMeta(info.description);
              }}
            >
              {t('ACTIONS_CANCEL')}
            </button>
            <button
              type="button"
              className="rt-btn rt-btn--sm rt-btn--primary"
              disabled={saveMetaMutation.isPending}
              onClick={() => saveMetaMutation.mutate({ path: { urn: info.urn }, body: { data: meta } })}
            >
              {t('SAVE')}
            </button>
          </div>
        )}
      </div>
      <div className="rt-prose">
        <Suspense>
          <AppDescriptionEditor isEditing={isEditing} meta={meta} setMeta={setMeta} />
        </Suspense>
      </div>
    </section>
  );
};

type InfoPanelProps = {
  info: AppInfo;
  app?: AppDetails | null;
  metadata?: AppMetadata;
};

const externalLabel = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export const AppInfoPanel = ({ info, app, metadata }: InfoPanelProps) => {
  const { t } = useTranslation();
  const sourceIsGithub = info.source?.includes('github.com');

  return (
    <section className="rt-panel rt-appd-side" aria-labelledby="rt-appd-info-title">
      <h2 id="rt-appd-info-title" className="rt-appd-h2 rt-appd-h2--sm">
        {t('APP_PAGE_DETAILS')}
      </h2>
      <dl className="rt-appd-info">
        <div>
          <dt>{t('APP_DETAILS_VERSION')}</dt>
          <dd className="rt-mono">{info.version}</dd>
        </div>
        {info.author && (
          <div>
            <dt>{t('APP_DETAILS_AUTHOR')}</dt>
            <dd>{info.author}</dd>
          </div>
        )}
        {(app?.port ?? info.port) && (
          <div>
            <dt>{t('APP_DETAILS_PORT')}</dt>
            <dd className="rt-mono">{app?.port ?? info.port}</dd>
          </div>
        )}
        {info.categories?.length > 0 && (
          <div>
            <dt>{t('APP_PAGE_CATEGORY')}</dt>
            <dd>
              {info.categories.map((category) => (
                <AppCategoryChip key={category} category={category} />
              ))}
            </dd>
          </div>
        )}
        {info.supported_architectures?.length > 0 && (
          <div>
            <dt>{t('APP_PAGE_ARCHITECTURES')}</dt>
            <dd>
              {info.supported_architectures.map((arch) => (
                <span key={arch} className="rt-appd-chip">
                  {arch.toLowerCase()}
                </span>
              ))}
            </dd>
          </div>
        )}
        {app && metadata && (
          <div>
            <dt>{t('APP_PAGE_OVERRIDES')}</dt>
            <dd>{metadata.hasCustomConfig ? t('YES') : t('NO')}</dd>
          </div>
        )}
        {info.source && (
          <div>
            <dt>{t('APP_DETAILS_SOURCE_CODE')}</dt>
            <dd>
              <a className="rt-appd-link" href={info.source} target="_blank" rel="noreferrer">
                {sourceIsGithub ? 'GitHub' : externalLabel(info.source)} ↗
              </a>
            </dd>
          </div>
        )}
        {info.website && (
          <div>
            <dt>{t('APP_DETAILS_WEBSITE')}</dt>
            <dd>
              <a className="rt-appd-link" href={info.website} target="_blank" rel="noreferrer">
                {externalLabel(info.website)} ↗
              </a>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
};

export const AfterInstallPanel = () => {
  const { t } = useTranslation();
  const steps = [t('APP_PAGE_AFTER_INSTALL_1'), t('APP_PAGE_AFTER_INSTALL_2'), t('APP_PAGE_AFTER_INSTALL_3')];

  return (
    <section className="rt-panel rt-appd-side" aria-labelledby="rt-appd-after-title">
      <h2 id="rt-appd-after-title" className="rt-appd-h2 rt-appd-h2--sm">
        {t('APP_PAGE_AFTER_INSTALL')}
      </h2>
      <ol className="rt-appd-steps">
        {steps.map((step, index) => (
          <li key={step}>
            <span className="rt-appd-steps__n">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
};
