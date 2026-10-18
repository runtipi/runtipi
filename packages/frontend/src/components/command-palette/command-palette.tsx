import { getInstalledAppsOptions } from '@/api-client/@tanstack/react-query.gen';
import { AppIcon } from '@/components/app-icon/app-icon';
import { useUIStore } from '@/stores/ui-store';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  IconAdjustmentsHorizontal,
  IconArrowRight,
  IconHome,
  IconLayoutGrid,
  IconSearch,
  IconShoppingBag,
  type IconAperture,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import './command-palette.css';

type Item = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  to: string;
};

const pageIcon = (Icon: typeof IconAperture) => (
  <span className="rt-palette__icon">
    <Icon size={18} stroke={1.8} aria-hidden="true" />
  </span>
);

/**
 * Global search (⌘K / Ctrl+K) to jump to pages, settings sections and installed apps.
 */
export const CommandPalette = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const open = useUIStore((state) => state.commandPaletteOpen);
  const setOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: apps } = useQuery({ ...getInstalledAppsOptions(), enabled: open });

  const items = useMemo(() => {
    const pages: Item[] = [
      { id: 'dashboard', group: t('SEARCH_GROUP_PAGES'), label: t('HEADER_DASHBOARD'), icon: pageIcon(IconHome), to: '/dashboard' },
      { id: 'apps', group: t('SEARCH_GROUP_PAGES'), label: t('HEADER_APPS'), icon: pageIcon(IconLayoutGrid), to: '/apps' },
      { id: 'app-store', group: t('SEARCH_GROUP_PAGES'), label: t('HEADER_APP_STORE'), icon: pageIcon(IconShoppingBag), to: '/app-store' },
      ...(['general', 'security', 'appstores', 'updates', 'logs'] as const).map((tab) => ({
        id: `settings-${tab}`,
        group: t('SEARCH_GROUP_PAGES'),
        label: `${t('HEADER_SETTINGS')} · ${t(`SETTINGS_SECTION_${tab.toUpperCase()}`)}`,
        icon: pageIcon(IconAdjustmentsHorizontal),
        to: `/settings?tab=${tab}`,
      })),
    ];

    const installed: Item[] = (apps?.installed ?? []).map(({ info }) => {
      const [appName, storeId] = info.urn.split(':');
      return {
        id: info.urn,
        group: t('SEARCH_GROUP_APPS'),
        label: info.name,
        hint: info.short_desc,
        icon: <AppIcon urn={info.urn} name={info.name} size={32} />,
        to: storeId === '_user' ? `/apps/${appName}` : `/apps/${storeId}/${appName}`,
      };
    });

    const normalized = query.trim().toLowerCase();
    const matches = (item: Item) => !normalized || item.label.toLowerCase().includes(normalized) || item.hint?.toLowerCase().includes(normalized);
    const result = [...installed.filter(matches), ...pages.filter(matches)];

    if (normalized) {
      result.push({
        id: 'store-search',
        group: t('HEADER_APP_STORE'),
        label: t('SEARCH_IN_APP_STORE', { query: query.trim() }),
        icon: pageIcon(IconSearch),
        to: `/app-store?search=${encodeURIComponent(query.trim())}`,
      });
    }

    return result;
  }, [apps, query, t]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the selection when the query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const select = (item?: Item) => {
    if (!item) return;
    setOpen(false);
    navigate(item.to);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(items[activeIndex]);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="rt-palette__overlay" />
        <DialogPrimitive.Content className="rt-palette" aria-describedby={undefined}>
          <DialogPrimitive.Title className="rt-sr">{t('SEARCH_PLACEHOLDER')}</DialogPrimitive.Title>
          <div className="rt-palette__search">
            <IconSearch size={18} stroke={1.8} aria-hidden="true" />
            <input
              // biome-ignore lint/a11y/noAutofocus: the palette is opened to type in it
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t('SEARCH_PLACEHOLDER')}
              role="combobox"
              aria-expanded="true"
              aria-controls="rt-palette-list"
              aria-activedescendant={items[activeIndex] ? `rt-palette-${items[activeIndex].id}` : undefined}
            />
            <span className="rt-kbd">Esc</span>
          </div>
          <div className="rt-palette__list" id="rt-palette-list" role="listbox" ref={listRef}>
            {items.length === 0 && <div className="rt-palette__empty">{t('SEARCH_NO_RESULTS')}</div>}
            {items.map((item, index) => (
              <div key={item.id}>
                {item.group !== items[index - 1]?.group && <div className="rt-palette__group rt-mono">{item.group}</div>}
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard selection is handled by the combobox input via aria-activedescendant */}
                <div
                  id={`rt-palette-${item.id}`}
                  role="option"
                  tabIndex={-1}
                  aria-selected={index === activeIndex}
                  data-index={index}
                  className={clsx('rt-palette__item', { 'is-active': index === activeIndex })}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => select(item)}
                >
                  {item.icon}
                  <span className="rt-palette__label">
                    <span>{item.label}</span>
                    {item.hint && <span className="rt-palette__hint">{item.hint}</span>}
                  </span>
                  <IconArrowRight size={16} stroke={1.8} className="rt-palette__arrow" aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
