'use client';

import type { MessageKey } from '@/server/utils/errors';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { Header } from 'src/app/(dashboard)/components/Header';

type Props = {
  children: React.ReactNode;
  title: MessageKey;
  subtitle?: MessageKey;
};

export const UnauthenticatedPage = (props: Props) => {
  const { children, title, subtitle } = props;
  const t = useTranslations();

  return (
    <div className="page">
      <Header authenticated={false} />
      <div className="page-wrapper">
        <div className="page-header d-print-none">
          <div className="container-xl">
            <div className={clsx('row g-2 align-items-center')}>
              <div className="col text-white">
                {subtitle && <div className="page-pretitle">{t(subtitle)}</div>}
                <h2 className="page-title mt-1">{t(title)}</h2>
              </div>
            </div>
          </div>
        </div>
        <div className="page-body">
          <div className="container-xl">{children}</div>
        </div>
      </div>
    </div>
  );
};
