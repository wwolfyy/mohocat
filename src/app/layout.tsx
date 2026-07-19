import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '산냥이집냥이',
  description: 'Explore cats living in the mountains',
};

// Add a new viewport export
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Optional: Prevents user zooming, can improve perceived stability
};

/**
 * Root layout: the tenant-independent HTML shell only (font, global CSS,
 * metadata). Everything tenant-scoped — providers, header/nav, footer — lives
 * in `[mountain]/layout.tsx`, inside the MountainProvider (multi-mountain plan
 * M3). `/api` routes are the only other children of this layout.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-oid="axlgnem">
      <body className={inter.className} data-oid="jwk6i0o">
        {children}
      </body>
    </html>
  );
}
