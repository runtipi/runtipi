import { AppLogo } from '@/components/app-logo/app-logo';
import type { CustomLink } from '@/types/app.types';
import type React from 'react';

type GuestLinkTileProps = {
  link: CustomLink;
};

export const GuestLinkTile: React.FC<GuestLinkTileProps> = ({ link }) => {
  const handleClick = () => {
    window.open(link.url, '_blank', 'noreferrer');
  };

  return (
    <div onClick={handleClick} className="col-sm-6 col-lg-4 app-link" style={{ cursor: 'pointer' }} data-testid={`guest-link-tile-${link.title}`}>
      <div className="card card-sm card-link">
        <div className="card-body">
          <div className="d-flex align-items-center overflow-hidden">
            <span className="me-3">
              <AppLogo url={link.iconUrl || ''} size={60} />
            </span>
            <div>
              <div className="d-flex h-3 align-items-center">
                <span className="h4 me-2 mb-1 fw-bolder">{link.title}</span>
              </div>
              {link.description?.length !== 0 && <div className="text-muted text-break">{link.description}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};