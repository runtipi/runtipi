import { getAppOptions } from '@/api-client/@tanstack/react-query.gen';
import type { RouteHandle } from '@/components/layouts/dashboard/layout';
import { useSuspenseQuery } from '@tanstack/react-query';
import { redirect, useParams } from 'react-router';
import { AppDetailsView } from '../components/app-details-view/app-details-view';
import type { Route } from './+types/app-details-page';

export const handle: RouteHandle = { ownHeader: true };

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const { storeId } = params;

  if (storeId === '_user') {
    return redirect(`/apps/${params.appId}`);
  }
}

export default () => {
  const { appId, storeId } = useParams<{ appId: string; storeId: string }>();

  const getApp = useSuspenseQuery({
    ...getAppOptions({ path: { urn: `${appId}:${storeId}` } }),
  });

  const { info, app, metadata } = getApp.data;

  return <AppDetailsView info={info} app={app} metadata={metadata} />;
};
