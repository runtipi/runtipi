/** @type {import('next').NextConfig} */
const { NODE_ENV, INTERNAL_IP } = process.env;

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
  },
};

module.exports = nextConfig;
