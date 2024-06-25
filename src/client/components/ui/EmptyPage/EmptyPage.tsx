import clsx from 'clsx';
import Image from 'next/image';
import React from 'react';
import { Button } from '../Button';
import styles from './EmptyPage.module.scss';

interface IProps {
  title: string;
  subtitle?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export const EmptyPage: React.FC<IProps> = ({ title, subtitle, onAction, actionLabel }) => (
  <div data-testid="empty-page" className="card empty">
    <Image
      src="/empty.svg"
      alt="Empty box"
      height="80"
      width="80"
      className={clsx(styles.emptyImage, 'mb-3')}
      style={{
        maxWidth: '100%',
        height: '80px',
      }}
    />
    <p className="empty-title">{title}</p>
    <p className="empty-subtitle text-muted">{subtitle}</p>
    <div className="empty-action">
      {onAction && (
        <Button data-testid="empty-page-action" onClick={onAction} intent="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  </div>
);
