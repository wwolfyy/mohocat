// The Storage emulator serves download URLs from `http://127.0.0.1:9199`, which
// `next/image` rejects with a 400 unless the host is whitelisted — and it is the
// e2e harness's only source of remote images (thumbnail/album fixtures use local
// `public/` paths; the about photo, live from Storage since 2026-08-02, does not).
// Gated on the emulator flag `.env.test` sets, so production keeps exactly one
// allowed remote host.
const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

const EMULATOR_IMAGE_PATTERNS = [
  { protocol: 'http', hostname: '127.0.0.1', port: '9199', pathname: '/v0/b/**' },
  { protocol: 'http', hostname: 'localhost', port: '9199', pathname: '/v0/b/**' },
];

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
      ...(USE_EMULATORS ? EMULATOR_IMAGE_PATTERNS : []),
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
