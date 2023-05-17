export const APP_LOCALES = {
  'en-US': 'English',
  'fr-FR': 'Français',
  'ja-JP': '日本語',
  'pl-PL': 'Polski',
  'ro-RO': 'Română',
  'ru-RU': 'Русский',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
} as const;

const FALLBACK_LOCALES = [
  { from: 'fr', to: 'fr-FR' },
  { from: 'en', to: 'en-US' },
  { from: 'ja', to: 'ja-JP' },
  { from: 'ro', to: 'ro-RO' },
  { from: 'ru', to: 'ru-RU' },
  { from: 'zh', to: 'zh-CN' },
  { from: 'pl', to: 'pl-PL' },
];

export type Locale = keyof typeof APP_LOCALES;

export const Locales = Object.keys(APP_LOCALES);
export const LOCALE_OPTIONS = Object.entries(APP_LOCALES).map(([value, label]) => ({ value, label }));

export const getLocaleFromString = (locale?: string): Locale => {
  if (!locale) {
    return 'en-US';
  }

  if (Locales.includes(locale)) {
    return locale as Locale;
  }

  const fallback = FALLBACK_LOCALES.find(({ from }) => locale.startsWith(from));
  if (fallback) {
    return fallback.to as Locale;
  }

  return 'en-US';
};
