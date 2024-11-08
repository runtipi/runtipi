'use client';

import { Button } from '@/components/ui/Button';
import type { MessageKey } from '@/server/utils/errors';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type React from 'react';
import styles from './EmptyPage.module.scss';

interface IProps {
  title: MessageKey;
  subtitle?: MessageKey;
  actionLabel?: MessageKey;
  redirectPath?: string;
}

export const EmptyPage: React.FC<IProps> = ({ title, subtitle, redirectPath, actionLabel }) => {
  const t = useTranslations();
  const router = useRouter();

  return (
    <div className="card empty">
      <Image
        src="/empty.svg"
        priority
        alt="Empty box"
        height="80"
        width="80"
        className={clsx(styles.emptyImage, 'mb-3')}
        style={{
          maxWidth: '100%',
          height: '80px',
        }}
      />
      <p className="empty-title">{t(title)}</p>
      {subtitle && <p className="empty-subtitle text-muted">{t(subtitle)}</p>}
      <div className="empty-action">
        {redirectPath && actionLabel && (
          <Button data-testid="empty-page-action" onClick={() => router.push(redirectPath)} intent="primary">
            {t(actionLabel)}
          </Button>
        )}
      </div>
    </div>
  );
};
