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
