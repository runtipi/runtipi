import { Flex } from '@chakra-ui/react';
import { AppCategoriesEnum } from '@runtipi/common';
import React from 'react';
import { useAppsStore } from '../../../state/appsStore';
import FeaturedApps from '../components/FeaturedApps';

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

const AppStoreContainer = () => {
  const { apps } = useAppsStore();

  const featuredApps = apps.map((app) => (app.categories?.includes(AppCategoriesEnum.FEATURED) ? app : null)).filter(nonNullable);

  return (
    <Flex className="flex-col">
      <h1 className="font-bold text-3xl mb-5">App Store</h1>
      <FeaturedApps apps={featuredApps} />
    </Flex>
  );
};

export default AppStoreContainer;
