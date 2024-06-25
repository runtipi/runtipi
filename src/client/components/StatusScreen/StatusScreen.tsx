import Image from 'next/image';
import React from 'react';
import { getLogo } from '@/lib/themes';
import { Button } from '../ui/Button';

interface IProps {
  title: string;
  subtitle: string;
  onAction?: () => void;
  actionTitle?: string;
  loading?: boolean;
}

export const StatusScreen: React.FC<IProps> = ({ title, subtitle, onAction, actionTitle, loading = true }) => (
  <div data-testid="status-screen" className="page page-center">
    <div className="container container-tight py-4 d-flex align-items-center flex-column">
      <Image
        alt="Tipi log"
        className="mb-3"
        src={getLogo(false)}
        height={50}
        width={50}
        style={{
          maxWidth: '100%',
          height: 'auto',
        }}
      />
      <h1 className="text-center mb-1">{title}</h1>
      <div className="text-center text-muted mb-3">{subtitle}</div>
      {loading && <div className="spinner-border spinner-border-sm text-muted" />}
      {onAction && (
        <div className="empty-action">
          <Button onClick={onAction}>{actionTitle}</Button>
        </div>
      )}
    </div>
  </div>
);
