import Image from 'next/image';
import React from 'react';
import { getUrl } from '../../../../core/helpers/url-helpers';

interface IProps {
  children: React.ReactNode;
}

export const AuthFormLayout: React.FC<IProps> = ({ children }) => (
  <div className="page page-center">
    <div className="container container-tight py-4">
      <div className="text-center mb-4">
        <Image
          alt="Tipi logo"
          src={getUrl('tipi.png')}
          height={50}
          width={50}
          style={{
            maxWidth: '100%',
            height: 'auto',
          }}
        />
      </div>
      <div className="card card-md">
        <div className="card-body">{children}</div>
      </div>
    </div>
  </div>
);
