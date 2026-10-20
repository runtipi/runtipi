import { useUserContext } from '@/context/user-context';
import { onSystemThemeChange, readColorMode, resolveColorMode, saveColorMode } from '@/lib/theme/color-mode';
import { type ResolvedTheme, useUIStore } from '@/stores/ui-store';
import type React from 'react';
import { useEffect, useRef } from 'react';

type Props = {
  children: React.ReactNode;
};

export const ThemeProvider = (props: Props) => {
  const { children } = props;
  const { themeBase, themeColor } = useUserContext();

  const colorMode = useUIStore((state) => state.colorMode);
  const setColorMode = useUIStore((state) => state.setColorMode);
  const setResolvedTheme = useUIStore((state) => state.setResolvedTheme);

  // Kept apart from the light/dark effect below, toggling the mode must not reset a color previewed in the settings
  useEffect(() => {
    if (themeBase) {
      document.body.dataset.bsThemeBase = themeBase;
    }

    if (themeColor) {
      document.body.dataset.bsThemePrimary = themeColor;
    }
  }, [themeBase, themeColor]);

  const loaded = useRef(false);

  useEffect(() => {
    // The store starts on "system", pick up the saved preference before applying anything so a saved choice doesn't flash
    if (!loaded.current) {
      loaded.current = true;
      const saved = readColorMode();
      if (saved !== colorMode) {
        setColorMode(saved);
        return;
      }
    }

    saveColorMode(colorMode);

    const apply = (theme: ResolvedTheme) => {
      document.body.dataset.bsTheme = theme;
      setResolvedTheme(theme);
    };
    apply(resolveColorMode(colorMode));

    // "system" keeps following the device while the page is open
    if (colorMode === 'system') return onSystemThemeChange(apply);
  }, [colorMode, setColorMode, setResolvedTheme]);

  return children;
};
