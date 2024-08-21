'use client';

import { usePathname } from 'next/navigation';
import { AppStoreTableActions } from '../../app-store/components/AppStoreTableActions/AppStoreTableActions';
import { UpdateAllButton } from '../../apps/components/UpdateAllButton/UpdateAllButton';

type Props = {
  availableUpdates: number;
};

export const LayoutActions = (props: Props) => {
  const { availableUpdates } = props;

  const pathname = usePathname();

  if (pathname === '/app-store') {
    return <AppStoreTableActions />;
  }

  if (pathname === '/apps' && availableUpdates >= 2) {
    return <UpdateAllButton />;
  }

  return null;
};
