import { getEnabledAppStoresOptions, getInstalledAppsOptions, searchAppsInfiniteOptions } from '@/api-client/@tanstack/react-query.gen';
import { AppIcon, getCategoryTint } from '@/components/app-icon/app-icon';
import type { RouteHandle } from '@/components/layouts/dashboard/layout';
import { PageHeader } from '@/components/page-header/page-header';
import { StoreSelector } from '@/components/store-selector/store-selector';
import { useAppContext } from '@/context/app-context';
import { useInfiniteScroll } from '@/lib/hooks/use-infinite-scroll';
import { useAppStoreState } from '@/stores/app-store';
import type { AppCategory, AppInfoSimple } from '@/types/app.types';
import { IconCheck, IconPlus, IconSearch } from '@tabler/icons-react';
import { keepPreviousData, useInfiniteQuery, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { getAppPath } from '../components/app-open-menu/app-open-menu';
import './app-store-page.css';

export const handle: RouteHandle = { ownHeader: true };

const FEATURED_COUNT = 2;

const getStoreAppPath = (urn: string) => {
  const [appName, storeId] = urn.split(':');
  return `/app-store/${storeId}/${appName}`;
};

const primaryCategory = (app: Pick<AppInfoSimple, 'categories'>) => app.categories?.find((category) => category !== 'featured');

/**
 * Pick featured apps that are not installed yet, rotating every day. Stores that don't feature apps
 * fall back to the most recently added ones.
 */
const pickFeatured = (apps: AppInfoSimple[], installed: Set<string>) => {
  const installable = apps.filter((app) => !installed.has(app.urn) && app.available && !app.deprecated);
  const featured = installable.filter((app) => app.categories?.includes('featured'));

  if (featured.length > FEATURED_COUNT) {
    const day = Math.floor(Date.now() / 86_400_000);
    return Array.from({ length: FEATURED_COUNT }, (_, i) => featured[(day + i) % featured.length]).filter((app): app is AppInfoSimple =>
      Boolean(app),
    );
  }

  const newest = installable.filter((app) => !featured.includes(app)).sort((a, b) => b.created_at - a.created_at);
  return [...featured, ...newest].slice(0, FEATURED_COUNT);
};

export default () => {
  const { t } = useTranslation();
  const params = useParams<{ storeId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { apps: allApps } = useAppContext();

  const selectedStore = searchParams.get('store') ?? undefined;
  const { setCategory, category, storeId, setStoreId, search: storedSearch, setSearch } = useAppStoreState();
  const [search, setLocalSearch] = useState(searchParams.get('search') ?? storedSearch);

  useEffect(() => {
    if (selectedStore !== storeId) {
      setStoreId(selectedStore);
    }
  }, [selectedStore, setStoreId, storeId]);

  // Search coming from the command palette
  useEffect(() => {
    const fromUrl = searchParams.get('search');
    if (fromUrl !== null) {
      setLocalSearch(fromUrl);
      setSearch(fromUrl);
    }
  }, [searchParams, setSearch]);

  const { data: appStores } = useSuspenseQuery({ ...getEnabledAppStoresOptions() });
  const { data: installedData } = useQuery({ ...getInstalledAppsOptions() });
  const installed = useMemo(() => new Set(installedData?.installed.map(({ info }) => info.urn)), [installedData]);

  const onSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalSearch(e.target.value);
      setSearch(e.target.value);
    },
    [setSearch],
  );

  const onSelectStore = useCallback(
    (value?: string) => {
      setSearchParams(value ? { store: value } : {});
      setStoreId(value);
    },
    [setSearchParams, setStoreId],
  );

  const { data, hasNextPage, isFetchingNextPage, isFetching, fetchNextPage } = useInfiniteQuery({
    ...searchAppsInfiniteOptions({ query: { search, category, pageSize: 24, storeId } }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    placeholderData: keepPreviousData,
  });

  const apps = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const { lastElementRef } = useInfiniteScroll({
    fetchNextPage,
    hasNextPage: Boolean(hasNextPage),
    isFetching: isFetchingNextPage || isFetching,
  });

  const storeApps = useMemo(() => allApps.filter((app) => !storeId || app.urn.endsWith(`:${storeId}`)), [allApps, storeId]);
  const featured = useMemo(() => pickFeatured(storeApps, installed), [storeApps, installed]);

  const chips = useMemo(() => {
    const counts = new Map<AppCategory, number>();
    for (const app of storeApps) {
      const main = primaryCategory(app);
      if (main) counts.set(main, (counts.get(main) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count }));
  }, [storeApps]);

  if (params.storeId) {
    return <Navigate to={`/app-store?store=${params.storeId}`} />;
  }

  const showFeatured = !search && !category && featured.length > 0;

  return (
    <>
      <div className="rt-store-hero">
        <PageHeader
          eyebrow={t('APP_STORE_EYEBROW')}
          title={<Trans i18nKey="APP_STORE_HEADLINE" components={{ accent: <span className="rt-store-hero__accent" /> }} />}
          subtitle={t('APP_STORE_INTRO')}
        />
        <label className="rt-store-search">
          <IconSearch size={20} stroke={1.8} aria-hidden="true" />
          <span className="rt-sr">{t('APP_STORE_SEARCH_LABEL')}</span>
          <input
            type="search"
            value={search}
            onChange={onSearch}
            placeholder={t('APP_STORE_SEARCH_PLACEHOLDER_LONG')}
            data-testid="app-store-search"
          />
        </label>
      </div>

      {showFeatured && (
        <section className="rt-store-section" aria-labelledby="rt-featured-title">
          <div className="rt-section-title">
            <h2 id="rt-featured-title">{t('APP_STORE_PICKED')}</h2>
            <span className="rt-section-title__rule" />
          </div>
          <div className="rt-store-featured">
            {featured.map((app) => {
              const main = primaryCategory(app);
              return (
                <article key={app.urn} className={clsx('rt-store-feat', `rt-cat--${getCategoryTint(app.categories)}`)}>
                  <div className="rt-store-feat__top">
                    <AppIcon name={app.name} urn={app.urn} categories={app.categories} size={72} />
                    {main && <span className="rt-store-feat__cat rt-mono">{t(`APP_CATEGORY_${main.toUpperCase()}`)}</span>}
                  </div>
                  <div>
                    <h3 className="rt-display">{app.name}</h3>
                    <p>{app.short_desc}</p>
                  </div>
                  <div className="rt-store-feat__actions">
                    <Link to={getStoreAppPath(app.urn)} className="rt-btn rt-btn--primary">
                      {t('APP_ACTION_INSTALL')}
                    </Link>
                    <Link to={getStoreAppPath(app.urn)} className="rt-btn">
                      {t('APP_STORE_DETAILS')}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="rt-store-section" aria-labelledby="rt-browse-title">
        <div className="rt-section-title rt-store-browse-title">
          <h2 id="rt-browse-title">{t('APP_STORE_BROWSE')}</h2>
          <span className="rt-section-title__count">{total}</span>
          <span className="rt-section-title__rule" />
          {appStores.appStores.length > 1 && (
            <StoreSelector className="rt-store-selector" initialValue={selectedStore} stores={appStores.appStores} onSelect={onSelectStore} />
          )}
        </div>

        <fieldset className="rt-store-chips">
          <legend className="rt-sr">{t('APP_STORE_FILTER_CATEGORY')}</legend>
          <button type="button" className={clsx('rt-chip', { 'is-on': !category })} aria-pressed={!category} onClick={() => setCategory(undefined)}>
            {t('MY_APPS_FILTER_ALL')} <span className="rt-chip__count">{storeApps.length}</span>
          </button>
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={clsx('rt-chip', { 'is-on': category === chip.id })}
              aria-pressed={category === chip.id}
              onClick={() => setCategory(category === chip.id ? undefined : chip.id)}
            >
              {t(`APP_CATEGORY_${chip.id.toUpperCase()}`)} <span className="rt-chip__count">{chip.count}</span>
            </button>
          ))}
        </fieldset>

        {data && apps.length === 0 ? (
          <div className="rt-store-empty">
            <h3 className="rt-display">{t('APP_STORE_NO_RESULTS')}</h3>
            <p>{t('APP_STORE_NO_RESULTS_SUBTITLE')}</p>
          </div>
        ) : (
          <div className={clsx('rt-store-grid', { 'is-loading': isFetching && !isFetchingNextPage })}>
            {apps.map((app, index) => {
              const isInstalled = installed.has(app.urn);
              const main = primaryCategory(app);
              return (
                <div key={app.urn} ref={index === apps.length - 1 ? lastElementRef : null} className="rt-store-card-wrap">
                  <article className="rt-store-card">
                    <div className="rt-store-card__top">
                      <AppIcon name={app.name} urn={app.urn} categories={app.categories} />
                      <div className="rt-store-card__text">
                        <h3>
                          <Link to={isInstalled ? getAppPath(app.urn) : getStoreAppPath(app.urn)} className="rt-store-card__name">
                            {app.name}
                          </Link>
                        </h3>
                        <p>{app.short_desc}</p>
                      </div>
                    </div>
                    <div className="rt-store-card__bottom">
                      <span className="rt-store-card__cat rt-mono">{main ? t(`APP_CATEGORY_${main.toUpperCase()}`) : ''}</span>
                      {isInstalled ? (
                        <span className="rt-store-card__have rt-mono">
                          <IconCheck size={14} stroke={2.2} aria-hidden="true" />
                          {t('APP_STORE_INSTALLED')}
                        </span>
                      ) : (
                        <Link
                          to={getStoreAppPath(app.urn)}
                          className="rt-store-card__add"
                          aria-label={t('APP_STORE_INSTALL_APP', { name: app.name })}
                          title={t('APP_STORE_INSTALL_APP', { name: app.name })}
                        >
                          <IconPlus size={18} stroke={2} />
                        </Link>
                      )}
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rt-store-custom">
        <div>
          <h2 className="rt-display">{t('APP_STORE_CANT_FIND')}</h2>
          <p>{t('APP_STORE_CANT_FIND_DESC')}</p>
        </div>
        <Link to="/apps/create" className="rt-btn">
          {t('CUSTOM_APP_ADD_TITLE')}
        </Link>
      </section>
    </>
  );
};
