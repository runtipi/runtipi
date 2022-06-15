import React from 'react';

const AppLogo: React.FC<{ src: string; size?: number; className?: string; alt?: string }> = ({ src, size = 80, className = '', alt = '' }) => {
  return (
    <div aria-label={alt} className={`drop-shadow ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="mask0" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
          <path fillRule="evenodd" clipRule="evenodd" d="M0 100C0 0 0 0 100 0S200 0 200 100 200 200 100 200 0 200 0 100" fill="white" />
        </mask>
        <image href={src} mask="url(#mask0)" width="200" height="200" />
      </svg>
    </div>
  );
};

export default AppLogo;
