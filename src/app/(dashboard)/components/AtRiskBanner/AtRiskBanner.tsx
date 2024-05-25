'use client';

import React from 'react';
import { OffCanvas } from 'src/app/components/OffCanvas/OffCanvas';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { useCookies } from 'next-client-cookies';
import { IconAlertTriangle } from '@tabler/icons-react';

export const AtRiskBanner = ({ isInsecure }: { isInsecure: boolean }) => {
  const { isOpen, close } = useDisclosure(isInsecure);
  const t = useTranslations();
  const cookies = useCookies();

  const onClose = () => {
    cookies.set('hide-insecure-instance', 'true', { path: '/', expires: 7 });
    close();
  };

  return (
    <OffCanvas position="bottom" visible={isOpen}>
      <div className="d-flex gap-4 align-items-center">
        <IconAlertTriangle color="orange" size={40} />
        <div>
          <h4 className="alert-title">{t('DASHBOARD_IP_WARNING_TITLE')}</h4>
          <div className="text-secondary">{t('DASHBOARD_IP_WARNING')}</div>
        </div>
        <Button className="flex-1" onClick={onClose}>
          {t('COMMON_CLOSE')}
        </Button>
      </div>
    </OffCanvas>
  );
};
