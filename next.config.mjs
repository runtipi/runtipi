import { withSentryConfig } from '@sentry/nextjs';
/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@runtipi/shared'],
  experimental: {
    serverComponentsExternalPackages: ['bullmq'],
    outputFileTracingIncludes: {
      '/login': ['./node_modules/argon2/**'],
    },
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

export default !process.env.LOCAL === 'true'
  ? withSentryConfig(
      nextConfig,
      {
        // https://github.com/getsentry/sentry-webpack-plugin#options
        silent: false,
        org: 'runtipi',
        project: 'runtipi-dashboard',
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
    )
  : nextConfig;
