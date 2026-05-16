/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

if (process.env.NEXT_OUTPUT_MODE === 'standalone') {
  nextConfig.output = 'standalone';
  nextConfig.outputFileTracingRoot = path.join(__dirname, '../');
  nextConfig.experimental = {
    outputFileTracingRoot: path.join(__dirname, '../'),
  };
}

module.exports = nextConfig;
