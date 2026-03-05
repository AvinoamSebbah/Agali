/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'world.openfoodfacts.org',
      },
      {
        protocol: 'https',
        hostname: 'm.pricez.co.il',
      },
      {
        protocol: 'https',
        hostname: 'images.openfoodfacts.org',
      },
    ],
  },
  // Disable SSL verification for external images in development
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

// Set Node to ignore SSL errors for image optimization
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

module.exports = nextConfig
