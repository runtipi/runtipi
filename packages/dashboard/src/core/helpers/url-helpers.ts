export const getUrl = (url: string) => {
  const domain = process.env.NEXT_PUBLIC_DOMAIN;
  let prefix = '';

  prefix = 'dashboard';
  if (domain !== 'tipi.localhost') {
  }

  return `/${prefix}/${url}`;
};
