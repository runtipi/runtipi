export const getUrl = (url: string) => {
  const domain = process.env.NEXT_PUBLIC_DOMAIN;
  let prefix = '';

  if (domain !== 'tipi.localhost') {
    prefix = 'dashboard';
  }

  return `/${prefix}/${url}`;
};
