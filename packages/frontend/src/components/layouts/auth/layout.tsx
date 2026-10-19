import { RuntipiLogo } from '@/components/layouts/app-shell/runtipi-logo';
import { useUserContext } from '@/context/user-context';
import { type Locale, locales, toSupportedLocale } from '@/lib/i18n/locales';
import i18next from 'i18next';
import { type PropsWithChildren, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import './auth.css';

const LanguageSelect = () => {
  const { t } = useTranslation();
  const [locale, setLocale] = useState<Locale>(toSupportedLocale(i18next.language));

  return (
    <label className="rt-auth-lang">
      <span className="rt-sr">{t('SETTINGS_GENERAL_LANGUAGE')}</span>
      <select
        name="language"
        value={locale}
        onChange={(event) => {
          const value = event.target.value as Locale;
          i18next.changeLanguage(value);
          setLocale(value);
        }}
      >
        {Object.entries(locales).map(([key, name]) => (
          <option key={key} value={key}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
};

export const AuthLayout = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation();
  const { isGuestDashboardEnabled, version } = useUserContext();

  return (
    <div className="rt-auth">
      <main className="rt-auth__main">
        <div className="rt-auth__top">
          <Link to={isGuestDashboardEnabled ? '/dashboard' : '/login'} className="rt-brand">
            <RuntipiLogo />
            <span className="rt-brand__name">runtipi</span>
          </Link>
          <LanguageSelect />
        </div>

        <div className="rt-auth__body">{children}</div>

        {version?.current && <p className="rt-auth__version rt-mono">runtipi {version.current}</p>}
      </main>

      <aside className="rt-auth__brand" aria-hidden="true">
        <div className="rt-auth__eyebrow rt-mono">{t('AUTH_BRAND_EYEBROW')}</div>
        <svg viewBox="0 0 400 360" className="rt-auth__tent" aria-hidden="true">
          <path d="M200 20 L380 340 H20 Z" fill="none" stroke="currentColor" strokeWidth="10" strokeLinejoin="round" />
          <path d="M200 180 L262 340 H138 Z" fill="currentColor" />
          <path d="M200 20 L182 -10 M200 20 L218 -10" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
          <path d="M104 190 H296 M76 240 H324" className="rt-auth__tent-poles" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <p className="rt-auth__tagline">{t('AUTH_BRAND_TAGLINE')}</p>
      </aside>
    </div>
  );
};
