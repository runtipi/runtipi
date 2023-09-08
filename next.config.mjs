/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@runtipi/shared'],
  experimental: {
    serverComponentsExternalPackages: ['bullmq'],
    serverActions: true,
  },
  serverRuntimeConfig: {
    INTERNAL_IP: process.env.INTERNAL_IP,
    TIPI_VERSION: process.env.TIPI_VERSION,
    JWT_SECRET: process.env.JWT_SECRET,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    POSTGRES_USERNAME: process.env.POSTGRES_USERNAME,
    POSTGRES_DBNAME: process.env.POSTGRES_DBNAME,
    POSTGRES_HOST: process.env.POSTGRES_HOST,
    APPS_REPO_ID: process.env.APPS_REPO_ID,
    APPS_REPO_URL: process.env.APPS_REPO_URL,
    DOMAIN: process.env.DOMAIN,
    ARCHITECTURE: process.env.ARCHITECTURE,
    NODE_ENV: process.env.NODE_ENV,
    REDIS_HOST: process.env.REDIS_HOST,
  },
};

export default nextConfig;
