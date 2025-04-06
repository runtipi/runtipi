import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import type { PropsWithChildren } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';

const Backend = new HttpBackend(null, {
  loadPath: '/api/i18n/locales/{{ns}}/{{lng}}.json',
});

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: import.meta.env.MODE === 'development',
    react: {
      useSuspense: true,
    },
    fallbackLng: 'en',
    load: 'currentOnly',
    interpolation: {
      escapeValue: false,
    },
  });

export const I18nProvider = ({ children }: PropsWithChildren) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};
