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
  basePath: '/dashboard',
};

module.exports = nextConfig;
