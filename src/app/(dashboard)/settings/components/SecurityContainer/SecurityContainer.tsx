'use client';

import { IconKey, IconLock, IconUser } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import React from 'react';
import { ChangePasswordForm } from '../ChangePasswordForm';
import { ChangeUsernameForm } from '../ChangeUsernameForm';
import { OtpForm } from '../OtpForm';

export const SecurityContainer = (props: { totpEnabled: boolean; username?: string }) => {
  const { totpEnabled, username } = props;
  const t = useTranslations();

  return (
    <div className="card-body">
      <div className="d-flex">
        <IconUser className="me-2" />
        <h2>{t('SETTINGS_SECURITY_CHANGE_USERNAME_TITLE')}</h2>
      </div>
      <p className="text-muted">{t('SETTINGS_SECURITY_CHANGE_USERNAME_SUBTITLE')}</p>
      <ChangeUsernameForm username={username} />
      <div className="d-flex">
        <IconKey className="me-2" />
        <h2>{t('SETTINGS_SECURITY_CHANGE_PASSWORD_TITLE')}</h2>
      </div>
      <p className="text-muted">{t('SETTINGS_SECURITY_CHANGE_PASSWORD_SUBTITLE')}</p>
      <ChangePasswordForm />
      <div className="d-flex">
        <IconLock className="me-2" />
        <h2>{t('SETTINGS_SECURITY_2FA_TITLE')}</h2>
      </div>
      <p className="text-muted">
        {t('SETTINGS_SECURITY_2FA_SUBTITLE')}
        <br />
        {t('SETTINGS_SECURITY_2FA_SUBTITLE_2')}
      </p>
      <OtpForm totpEnabled={totpEnabled} />
    </div>
  );
};
