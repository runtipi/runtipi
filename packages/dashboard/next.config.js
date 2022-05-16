/** @type {import('next').NextConfig} */
const { NODE_ENV, INTERNAL_IP } = process.env;

const nextConfig = {
  reactStrictMode: false,
  env: {
    INTERNAL_IP: NODE_ENV === 'development' ? 'localhost' : INTERNAL_IP,
  },
};

module.exports = nextConfig;
