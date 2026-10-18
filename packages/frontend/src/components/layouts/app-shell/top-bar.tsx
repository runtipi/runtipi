import { useUIStore } from '@/stores/ui-store';
import { IconSearch } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

const isMac = () => typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

type Props = {
  /** Placeholder of the search trigger */
  placeholder?: string;
  /** Hide the global search, e.g. when the page has its own search */
  hideSearch?: boolean;
  children?: ReactNode;
};

/**
 * Bar at the top of each page: the global search on the left and page actions on the right.
 */
export const TopBar = ({ placeholder, hideSearch, children }: Props) => {
  const { t } = useTranslation();
  const openPalette = useUIStore((state) => state.setCommandPaletteOpen);

  return (
    <div className="rt-topbar">
      {!hideSearch && (
        <button type="button" className="rt-search" onClick={() => openPalette(true)} data-testid="global-search">
          <IconSearch size={17} stroke={1.8} aria-hidden="true" />
          <span className="rt-search__placeholder">{placeholder ?? t('SEARCH_PLACEHOLDER')}</span>
          <span className="rt-kbd">{isMac() ? '⌘K' : 'Ctrl K'}</span>
        </button>
      )}
      {children && <div className="rt-topbar__actions">{children}</div>}
    </div>
  );
};
