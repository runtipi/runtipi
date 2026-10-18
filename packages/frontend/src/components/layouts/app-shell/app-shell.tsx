import { CommandPalette } from '@/components/command-palette/command-palette';
import { useUIStore } from '@/stores/ui-store';
import { IconMenu2, IconX } from '@tabler/icons-react';
import clsx from 'clsx';
import { type PropsWithChildren, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { RuntipiLogo } from './runtipi-logo';
import { Sidebar } from './sidebar';
import './app-shell.css';

/**
 * Layout of every authenticated page: a sidebar on large screens, a top bar with a drawer on small ones.
 */
export const AppShell = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);

  // biome-ignore lint/correctness/useExhaustiveDependencies: close the drawer when navigating
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setCommandPaletteOpen]);

  return (
    <div className="rt-shell">
      <header className="rt-mobilebar">
        <button
          type="button"
          className="rt-icon-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label={t('SIDEBAR_OPEN_MENU')}
          aria-expanded={drawerOpen}
          aria-controls="rt-sidebar"
        >
          <IconMenu2 size={18} stroke={1.8} />
        </button>
        <Link to="/dashboard" className="rt-sidebar__brand">
          <RuntipiLogo size={24} />
          <span className="rt-display">runtipi</span>
        </Link>
      </header>

      <aside id="rt-sidebar" className={clsx('rt-sidebar', { 'is-open': drawerOpen })} aria-label={t('HEADER_MAIN_NAVIGATION')}>
        <button type="button" className="rt-icon-btn rt-sidebar__close" onClick={() => setDrawerOpen(false)} aria-label={t('SIDEBAR_CLOSE_MENU')}>
          <IconX size={18} stroke={1.8} />
        </button>
        <Sidebar onNavigate={() => setDrawerOpen(false)} />
      </aside>
      {drawerOpen && <button type="button" className="rt-shell__scrim" aria-label={t('SIDEBAR_CLOSE_MENU')} onClick={() => setDrawerOpen(false)} />}

      <main className="rt-main">{children}</main>
      <CommandPalette />
    </div>
  );
};
