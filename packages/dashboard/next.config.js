/** @type {import('next').NextConfig} */
const { INTERNAL_IP, DOMAIN, NGINX_PORT } = process.env;

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
    NEXT_PUBLIC_INTERNAL_IP: INTERNAL_IP,
    NEXT_PUBLIC_DOMAIN: DOMAIN,
    NEXT_PUBLIC_PORT: NGINX_PORT,
  },
  basePath: '/dashboard',
};

module.exports = nextConfig;
