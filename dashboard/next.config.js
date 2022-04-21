/** @type {import('next').NextConfig} */
console.log(process.env);

const nextConfig = {
  reactStrictMode: true,
  env: {
    INTERNAL_IP: process.env.INTERNAL_IP,
  },
};

module.exports = nextConfig;
