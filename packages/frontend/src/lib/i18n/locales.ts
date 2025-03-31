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
