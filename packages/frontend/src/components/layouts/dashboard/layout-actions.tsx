import { AppStoreLayoutActions } from '@/components/app-store-layout-actions/app-store-layout-actions';
import { BatchActionsButton } from '@/modules/app/components/batch-actions-button';
import { useUIStore } from '@/stores/ui-store';

type Props = {
  availableUpdates: number;
};

export const LayoutActions = (props: Props) => {
  const { availableUpdates } = props;
  const activeRoute = useUIStore((state) => state.activeRoute);

  if (activeRoute === 'app-store') {
    return <AppStoreLayoutActions />;
  }

  if (activeRoute === 'apps') {
    return <BatchActionsButton availableUpdates={availableUpdates} />;
  }

  return null;
};
