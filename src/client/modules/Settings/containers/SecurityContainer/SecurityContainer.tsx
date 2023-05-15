import React from 'react';
import { IconLock, IconKey } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { OtpForm } from '../../components/OtpForm';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';

export const SecurityContainer = () => {
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
      <OtpForm />
    </div>
  );
};
