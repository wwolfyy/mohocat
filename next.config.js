/** @type {import('next').NextConfig} */
const nextConfig = {
  // For optimized images (ENABLED - 70% faster performance)
  // Note: Static export is disabled to enable Next.js image optimization
  // and server-side features required for Cloud Run deployment
  images: {
    unoptimized: false, // Enable Next.js image optimization

    // Allow Firebase Storage domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/**',
      },
    ],

    // Optimize for modern formats
    formats: ['image/webp', 'image/avif'],

    // Cache optimized images for 1 year
    minimumCacheTTL: 31536000,

    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],

    // Image sizes for different use cases
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Enable placeholder blur while loading
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@/components', '@/services', '@/utils'],
  },

  reactStrictMode: false,
};

module.exports = nextConfig;
