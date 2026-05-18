/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../'),
  },
};
module.exports = nextConfig;
