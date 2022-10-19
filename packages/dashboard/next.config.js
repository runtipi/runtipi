/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
