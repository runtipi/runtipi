/** @type {import('next').NextConfig} */
const { INTERNAL_IP, DOMAIN } = process.env;

const nextConfig = {
  webpackDevMiddleware: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
  reactStrictMode: true,
  env: {
    INTERNAL_IP: INTERNAL_IP,
    NEXT_PUBLIC_DOMAIN: DOMAIN,
  },
  basePath: '/dashboard',
};

module.exports = nextConfig;
