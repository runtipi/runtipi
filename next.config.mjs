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

export default process.env.LOCAL !== 'true'
  ? withSentryConfig(nextConfig, {
      silent: false,
      org: 'runtipi',
      project: 'runtipi-dashboard',
      widenClientFileUpload: true,
      tunnelRoute: '/errors',
      hideSourceMaps: false,
      disableLogger: false,
    })
  : nextConfig;
