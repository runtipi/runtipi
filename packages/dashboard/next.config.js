/** @type {import('next').NextConfig} */
const { NODE_ENV, INTERNAL_IP } = process.env;

const nextConfig = {
  reactStrictMode: true,
  env: {
    INTERNAL_IP: INTERNAL_IP,
  },
};

module.exports = nextConfig;
