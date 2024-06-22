import { withSentryConfig } from '@sentry/nextjs';
import withNextIntl from 'next-intl/plugin';

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

const sentryConfig = {
  silent: false,
  org: 'runtipi',
  project: 'runtipi-dashboard',
  widenClientFileUpload: true,
  tunnelRoute: '/errors',
  hideSourceMaps: false,
  disableLogger: false,
};

const config = process.env.LOCAL !== 'true' ? withSentryConfig(nextConfig, sentryConfig) : nextConfig;

export default withNextIntl()(config);
