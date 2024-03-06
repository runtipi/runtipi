import { withSentryConfig } from '@sentry/nextjs';
/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@runtipi/shared'],
  experimental: {
    serverComponentsExternalPackages: ['bullmq', '@sentry/nextjs'],
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
    ALLOW_ERROR_MONITORING: process.env.ALLOW_ERROR_MONITORING,
  },
  async rewrites() {
    return [
      {
        source: '/apps/:id',
        destination: '/app-store/:id',
      },
    ];
  },
};

export default withSentryConfig(
  nextConfig,
  {
    // https://github.com/getsentry/sentry-webpack-plugin#options
    silent: false,
    org: 'runtipi',
    project: 'runtipi-dashboard',
    dryRun: process.env.SENTRY_DISABLE_AUTO_UPLOAD === 'true',
    release: process.env.TIPI_VERSION,
  },
  {
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
    widenClientFileUpload: true,
    transpileClientSDK: false,
    tunnelRoute: '/errors',
    hideSourceMaps: false,
    disableLogger: true,
  },
);
