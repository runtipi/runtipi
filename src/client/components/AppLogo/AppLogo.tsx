import clsx from 'clsx';
import type React from 'react';
import styles from './AppLogo.module.scss';

export const AppLogo: React.FC<{ id?: string; url?: string; size?: number; className?: string; alt?: string }> = ({
  id,
  url,
  size = 80,
  className = '',
  alt = '',
}) => {
  const logoUrl = id ? `/api/app-image?id=${id}` : '/app-not-found.jpg';

  return (
    <div aria-label={alt} className={clsx(styles.dropShadow, className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="mask0" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
          <path fillRule="evenodd" clipRule="evenodd" d="M-1 100C0 0 0 0 100 0S200 0 200 100 200 200 100 200 0 200 0 100" fill="white" />
        </mask>
        <image href={url || logoUrl} mask="url(#mask0)" width="200" height="200" />
      </svg>
    </div>
  );
};
