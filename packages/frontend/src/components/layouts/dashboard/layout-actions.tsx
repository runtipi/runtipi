import { AppStoreLayoutActions } from '@/components/app-store-layout-actions/app-store-layout-actions';
import { useUIStore } from '@/stores/ui-store';

type Props = {
  availableUpdates: number;
};

export const LayoutActions = (props: Props) => {
  // const { availableUpdates } = props;
  const { activeRoute } = useUIStore();

  if (activeRoute === 'app-store') {
    return <AppStoreLayoutActions />;
  }

  // if (activeRoute === '/apps' && availableUpdates >= 2) {
  //   return <UpdateAllButton />;
  // }

  return null;
};
