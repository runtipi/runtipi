import type { ColorMode } from '@/stores/ui-store';
import { resolveColorMode } from './color-mode';

type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => unknown };

/**
 * Runs a visual change, like switching between light and dark, as a crossfade when the browser supports
 * view transitions and the user has not asked for reduced motion.
 */
export const withViewTransition = (update: () => void) => {
  const doc = document as ViewTransitionDocument;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (!doc.startViewTransition || reduced) {
    update();
    return;
  }

  doc.startViewTransition(update);
};

/** Switch the color mode, updating the page right away so the transition captures the new look */
export const switchColorMode = (mode: ColorMode, setColorMode: (mode: ColorMode) => void) => {
  const next = resolveColorMode(mode);
  const update = () => {
    document.body.dataset.bsTheme = next;
    setColorMode(mode);
  };

  // Nothing changes on screen (e.g. "system" while the device matches the current theme), no need to animate
  if (document.body.dataset.bsTheme === next) update();
  else withViewTransition(update);
};
