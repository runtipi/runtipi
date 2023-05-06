export const APP_LOCALES = {
  en: 'English',
  'fr-FR': 'Français',
} as const;

const FALLBACK_LOCALES = [
  { from: 'fr', to: 'fr-FR' },
  { from: 'en', to: 'en' },
];

export type Locale = keyof typeof APP_LOCALES;

export const Locales = Object.keys(APP_LOCALES) as Locale[];
export const LOCALE_OPTIONS = Object.entries(APP_LOCALES).map(([value, label]) => ({ value, label }));

export const getLocaleFromString = (locale?: string): Locale => {
  if (!locale) {
    return 'en';
  }

  if (Locales.includes(locale)) {
    return locale as Locale;
  }

  const fallback = FALLBACK_LOCALES.find(({ from }) => locale.startsWith(from));
  if (fallback) {
    return fallback.to as Locale;
  }

  return 'en';
};
