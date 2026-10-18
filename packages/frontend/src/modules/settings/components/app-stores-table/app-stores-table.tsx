import type { AppStore } from '@/types/app.types';
import { useTranslation } from 'react-i18next';
import { DeleteAppStoreDialog } from '../delete-app-store-dialog/delete-app-store-dialog';
import { EditAppStoreDialog } from '../edit-app-store-dialog/edit-app-store-dialog';

type Props = {
  appStores: AppStore[];
};

const displayUrl = (url: string) => url.replace(/^https?:\/\//, '').replace(/\.git$/, '');

export const AppStoresTable = ({ appStores }: Props) => {
  const { t } = useTranslation();

  return (
    <ul className="rt-stores">
      {appStores.map((appStore) => (
        <li key={appStore.slug} className="rt-store-row">
          <span className="rt-store-row__name rt-mono">{appStore.name}</span>
          <span className={`rt-store-row__status ${appStore.enabled ? '' : 'rt-store-row__status--off'}`}>
            <span className="rt-store-row__dot" aria-hidden="true" />
            {appStore.enabled ? t('SETTINGS_APPSTORES_ENABLED') : t('SETTINGS_APPSTORES_DISABLED')}
          </span>
          <a className="rt-store-row__url rt-mono" href={appStore.url} target="_blank" rel="noreferrer noopener nofollow" title={appStore.url}>
            {displayUrl(appStore.url)}
          </a>
          <span className="rt-store-row__actions">
            <EditAppStoreDialog appStore={appStore} />
            <DeleteAppStoreDialog appStore={appStore} />
          </span>
        </li>
      ))}
    </ul>
  );
};
