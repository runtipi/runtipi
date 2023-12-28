'use client';

import { usePathname } from 'next/navigation';
import React from 'react';
import { AppStoreTableActions } from '../../app-store/components/AppStoreTableActions/AppStoreTableActions';
import { AddLinkBtn } from '../AddLink/AddLinkBtn';

export const LayoutActions = () => {
  const pathname = usePathname();

  if (pathname === '/app-store') {
    return <AppStoreTableActions />;
  }

  if (pathname === '/apps') {
    return <AddLinkBtn />
  }

  return null;
};
