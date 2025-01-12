import { LanguageSelector } from '@/components/language-selector/language-selector';
import { useUserContext } from '@/context/user-context';
import { getCurrentLocale } from '@/lib/i18n/locales';
import { getLogo } from '@/lib/theme/theme';
import type { PropsWithChildren } from 'react';

export const AuthLayout = ({ children }: PropsWithChildren) => {
  const locale = getCurrentLocale();

  const { allowAutoThemes } = useUserContext();
  return (
    <div className="page page-center">
      <div className="position-absolute top-0 mt-3 end-0 me-1 pb-4">
        <LanguageSelector locale={locale} />
      </div>
      <div className="container container-tight py-4">
        <div className="text-center mb-4">
          <img
            alt="Runtipi logo"
            src={getLogo(allowAutoThemes)}
            height={50}
            width={50}
            style={{
              maxWidth: '100%',
              height: 'auto',
            }}
          />
        </div>
        <div className="card card-md">
          <div className="card-body">{children}</div>
        </div>
      </div>
    </div>
  );
};
