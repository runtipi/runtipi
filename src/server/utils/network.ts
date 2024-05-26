import { cookies, headers } from 'next/headers';
import * as ipaddrjs from 'ipaddr.js';

export const isInstanceInsecure = () => {
  const cookieStore = cookies();
  const isInsecureBannerHidden = cookieStore.get('hide-insecure-instance')?.value;

  if (isInsecureBannerHidden) {
    return false;
  }

  const myHeaders = headers();
  const ip = myHeaders.get('x-forwarded-host')?.split(':')[0] || '';

  const isPublicIp = ipaddrjs.isValid(ip) && !['private', 'carrierGradeNat', 'loopback'].includes(ipaddrjs.parse(ip).range());
  const isHttpProtocol = ip !== 'localhost' && myHeaders.get('x-forwarded-proto') === 'http';
  return isPublicIp || isHttpProtocol;
};
