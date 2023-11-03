'use client';

import React from 'react';
import { IconLock, IconKey, IconUser } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { OtpForm } from '../OtpForm';
import { ChangePasswordForm } from '../ChangePasswordForm';
import { ChangeUsernameForm } from '../ChangeUsernameForm';

export const SecurityContainer = (props: { totpEnabled: boolean; username?: string }) => {
  const { totpEnabled, username } = props;
  const t = useTranslations('settings.security');

  return (
    <div className="card-body">
      <div className="d-flex">
        <IconUser className="me-2" />
        <h2>{t('change-username.title')}</h2>
      </div>
      <p className="text-muted">{t('change-username.subtitle')}</p>
      <ChangeUsernameForm username={username} />
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
