'use client';

import React from 'react';
import { AppLogo } from '../AppLogo';

type LinkTileProps = {
  title: string;
  url: string;
  iconURL: string | null;
}

export const LinkTile: React.FC<LinkTileProps> = ({ title, iconURL }) => {
  return (
    <div data-testid={`link-tile-${title}`}>
      <div className="card card-sm card-link">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <span className="me-3">
              <AppLogo url={iconURL || ''} size={60} />
            </span>
            <div>
              <div className="d-flex h-3 align-items-center">
                <span className="h4 me-2 mb-1 fw-bolder">{title}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
