import Image from 'next/image';
import React from 'react';
import { getUrl } from '../../../core/helpers/url-helpers';
import { Button } from '../Button';
import styles from './EmptyPage.module.scss';

interface IProps {
  title: string;
  subtitle?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export const EmptyPage: React.FC<IProps> = ({ title, subtitle, onAction, actionLabel }) => (
  <div className="card empty">
    <Image src={getUrl('empty.svg')} alt="Empty box" height="80" width="80" className={styles.emptyImage} />
    <p className="empty-title">{title}</p>
    <p className="empty-subtitle text-muted">{subtitle}</p>
    <div className="empty-action">
      {onAction && (
        <Button onClick={onAction} className="btn-primary">
          {actionLabel}
        </Button>
      )}
    </div>
  </div>
);
