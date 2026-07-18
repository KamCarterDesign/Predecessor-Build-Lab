import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'omeda.city',
      },
      {
        protocol: 'https',
        hostname: 'pred.gg',
      },
    ],
  },
}

export default nextConfig
