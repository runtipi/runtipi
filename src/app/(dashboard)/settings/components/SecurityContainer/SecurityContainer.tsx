'use client';

import React from 'react';
import { IconLock, IconKey } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { OtpForm } from '../OtpForm';
import { ChangePasswordForm } from '../ChangePasswordForm';

export const SecurityContainer = (props: { totpEnabled: boolean }) => {
  const { totpEnabled } = props;
  const t = useTranslations('settings.security');

  return (
    <div className="card-body">
      <div className="d-flex">
        <IconKey className="me-2" />
        <h2>{t('change-password-title')}</h2>
      </div>
      <p className="text-muted">{t('change-password-subtitle')}</p>
      <ChangePasswordForm />
      <div className="d-flex">
        <IconLock className="me-2" />
        <h2>{t('2fa-title')}</h2>
      </div>
      <p className="text-muted">
        {t('2fa-subtitle')}
        <br />
        {t('2fa-subtitle-2')}
      </p>
      <OtpForm totpEnabled={totpEnabled} />
    </div>
  );
};
