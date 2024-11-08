import { IconRotateClockwise } from '@tabler/icons-react';
import clsx from 'clsx';
import Image from 'next/image';
import type React from 'react';
import { Button } from '../Button';
import styles from './ErrorPage.module.scss';

interface IProps {
  error?: string;
  onRetry?: () => void;
  actionLabel?: string;
}

export const ErrorPage: React.FC<IProps> = ({ error, onRetry }) => (
  <div data-testid="error-page" className="card empty">
    <Image
      src="/error.png"
      alt="Empty box"
      height="100"
      width="100"
      className={clsx(styles.emptyImage, 'mb-3 mt-2')}
      style={{
        maxWidth: '100%',
        height: 'auto',
      }}
    />
    <p className="empty-title">An error occured</p>
    <p className="empty-subtitle text-muted">{error}</p>
    <div className="empty-action">
      {onRetry && (
        <Button data-testid="error-page-action" onClick={onRetry} intent="danger">
          <IconRotateClockwise />
          Retry
        </Button>
      )}
    </div>
  </div>
);
