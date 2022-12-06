import Image from 'next/image';
import React from 'react';
import { getUrl } from '../../core/helpers/url-helpers';

interface IProps {
  title: string;
  subtitle: string;
}

export const StatusScreen: React.FC<IProps> = ({ title, subtitle }) => (
  <div className="page page-center">
    <div className="container container-tight py-4 d-flex align-items-center flex-column">
      <Image alt="Tipi log" className="mb-3" layout="intrinsic" src={getUrl('tipi.png')} height={50} width={50} />
      <h1 className="text-center mb-1">{title}</h1>
      <div className="text-center text-muted mb-3">{subtitle}</div>
      <div className="spinner-border spinner-border-sm text-muted" />
    </div>
  </div>
);
