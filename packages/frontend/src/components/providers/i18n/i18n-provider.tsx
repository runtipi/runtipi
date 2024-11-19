import { getCurrentLocale } from '@/lib/i18n/locales';
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import type { PropsWithChildren } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    react: {
      useSuspense: true,
    },
    backend: {
      loadPath: '/api/i18n/locales/{{ns}}/{{lng}}.json',
    },
    fallbackLng: 'en',
    lng: getCurrentLocale(),
    interpolation: {
      escapeValue: false,
    },
  });

export const I18nProvider = ({ children }: PropsWithChildren) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};
