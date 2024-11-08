import { getLogo } from '@/lib/themes';
import { TipiConfig } from '@/server/core/TipiConfig';
import Image from 'next/image';
import type React from 'react';
import { getCurrentLocale } from 'src/utils/getCurrentLocale';
import { LanguageSelector } from '../components/LanguageSelector';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = getCurrentLocale();
  const { allowAutoThemes } = TipiConfig.getConfig();

  return (
    <div className="page page-center">
      <div className="position-absolute top-0 mt-3 end-0 me-1 pb-4">
        <LanguageSelector locale={locale} />
      </div>
      <div className="container container-tight py-4">
        <div className="text-center mb-4">
          <Image
            alt="Tipi logo"
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
}
