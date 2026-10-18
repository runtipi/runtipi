export const locales = {
  'de-DE': 'Deutsch',
  'en-US': 'English',
  'es-ES': 'Español',
  'el-GR': 'Ελληνικά',
  'fr-FR': 'Français',
  'it-IT': 'Italiano',
  'hu-HU': 'Magyar',
  'ja-JP': '日本語',
  'pl-PL': 'Polski',
  'sv-SE': 'Svenska',
  'ro-RO': 'Română',
  'ru-RU': 'Русский',
  'tr-TR': 'Türkçe',
  'uk-UA': 'Українська',
  'vi-VN': 'Tiếng Việt',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'pt-PT': 'Português',
  'pt-BR': 'Português (Brasil)',
} as const;

export type Locale = keyof typeof locales;

export const getLocaleName = (locale: Locale): string => locales[locale];

// Maps a detected language (e.g. `en-US@posix`, `fr`) to the closest supported locale
export const toSupportedLocale = (language: string): Locale => {
  const keys = Object.keys(locales) as Locale[];
  const clean = language.split('@')[0] ?? language;
  return keys.find((key) => key === clean) ?? keys.find((key) => key.split('-')[0] === clean.split('-')[0]) ?? 'en-US';
};
