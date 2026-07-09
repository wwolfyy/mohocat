// Example: Enable full Next.js optimization
const nextConfig = {
  images: {
    // Remove unoptimized: true
    domains: ['firebasestorage.googleapis.com'],
    formats: ['image/webp', 'image/jpeg'],
  },
};
