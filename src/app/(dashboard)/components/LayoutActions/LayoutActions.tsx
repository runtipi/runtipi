'use client';

import { usePathname } from 'next/navigation';
import React from 'react';
import { AppStoreTableActions } from '../../app-store/components/AppStoreTableActions/AppStoreTableActions';

export const LayoutActions = () => {
  const pathname = usePathname();

  if (pathname === '/app-store') {
    return <AppStoreTableActions />;
  }

  return null;
};
