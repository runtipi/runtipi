import type { PropsWithChildren } from 'react';
import { LocationListener } from '../providers/location-listener/location-listener';

export const RouteWrapper = ({ children }: PropsWithChildren) => {
  return (
    <>
      {children}
      <LocationListener />
    </>
  );
};
