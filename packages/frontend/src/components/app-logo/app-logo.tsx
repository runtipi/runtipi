import clsx from 'clsx';
import type React from 'react';
import './app-logo.css';

export const AppLogo: React.FC<{ id?: string; url?: string; size?: number; className?: string; alt?: string; placeholder?: boolean }> = ({
  id,
  url,
  size = 80,
  className = '',
  alt = '',
}) => {
  const logoUrl = id ? `/api/marketplace/${id}/image` : '/app-not-found.jpg';

  return (
    <div aria-label={alt} className={clsx('drop-shadow', className)} style={{ width: size, height: size, minWidth: size }}>
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: Svg has no alt attibute */}
      <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="mask0" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
          <path fillRule="evenodd" clipRule="evenodd" d="M-1 100C0 0 0 0 100 0S200 0 200 100 200 200 100 200 0 200 0 100" fill="white" />
        </mask>
        <image className="logo-image" href={url || logoUrl} mask="url(#mask0)" width="200" height="200" />
      </svg>
    </div>
  );
};
