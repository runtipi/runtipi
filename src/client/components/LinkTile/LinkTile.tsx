'use client';

import React from 'react';
import { limitText } from '@/lib/helpers/text-helpers';

type LinktileProps = {
  title: string;
  url: string;
}

export const LinkTile: React.FC<LinktileProps> = ({title, url}) => {
  return (
    <div data-testid={`link-tile-${title}`}>
      <div className="card card-sm card-link">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <span className="me-3">
              {/* <AppLogo alt={`${app.name} logo`} id={app.id} size={60} /> */}
            </span>
            <div>
              <div className="d-flex h-3 align-items-center">
                <span className="h4 me-2 mb-1 fw-bolder">{title}</span>
              </div>
              <div className="text-muted">{limitText(url, 50)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
