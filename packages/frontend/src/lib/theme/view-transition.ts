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
export const switchColorMode = (dark: boolean, setDarkMode: (dark: boolean) => void) =>
  withViewTransition(() => {
    document.body.dataset.bsTheme = dark ? 'dark' : 'light';
    setDarkMode(dark);
  });
