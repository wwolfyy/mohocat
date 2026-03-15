import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import MountainSelector from '@/components/MountainSelector';
import Link from 'next/link';
import Image from 'next/image';
import { AnnouncementModalProvider } from '@/contexts/AnnouncementModalContext';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mountain Cats',
  description: 'Explore cats living in the mountains',
};

// Add a new viewport export
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Optional: Prevents user zooming, can improve perceived stability
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-oid="axlgnem">
      <body className={inter.className} data-oid="jwk6i0o">
        <AnnouncementModalProvider>
          <AuthProvider>
            <AnalyticsTracker />
            <div
              className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 overflow-x-hidden"
              data-oid="7-_qmcr"
            >
              <header className="bg-white shadow-sm relative z-10" data-oid="rho93zh">
                <div
                  className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-4 pb-1 flex justify-between items-center"
                  data-oid="s43864t"
                >
                  {' '}
                  {/* Added pb-1 for a small space */}
                  <div className="flex items-center space-x-4" data-oid="bvc1q.c">
                    <Link
                      href="/"
                      className="group hover:text-blue-600 transition-colors duration-300"
                      data-oid="mry3xtu"
                    >
                      <div className="flex items-center" data-oid="htl-mls">
                        <div className="relative animate-slide-in-left" data-oid="pix5iyn">
                          <Image
                            // src="/images/tux_cat_favicon_1.png"
                            // src="/images/tux_cat_favicon_2.png"
                            src="/images/black_cat_stealth_favicon.png"
                            alt="Site Logo"
                            width={28} // Reduced from 32
                            height={28} // Reduced from 32
                            style={{ width: '28px', height: '28px' }} // Explicitly set size to avoid aspect ratio warnings
                            className="mr-2 rounded-full transition-all duration-500 ease-in-out group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg animate-pulse-subtle" // Adds a small margin to the right of the logo
                            data-oid="wsatj2l"
                          />

                          {/* Subtle glow effect on hover */}
                          <div
                            className="absolute inset-0 rounded-full bg-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-sm"
                            data-oid="wwrgxtg"
                          ></div>
                        </div>
                        <h1
                          className="text-lg font-semibold text-gray-900 transition-all duration-300 group-hover:text-blue-600"
                          data-oid="z3icpyx"
                        >
                          산냥이집냥이
                        </h1>
                      </div>
                    </Link>
                    <div className="animate-slide-in-right" data-oid="0fq9.g2">
                      <MountainSelector data-oid=".9-o4f1" />
                    </div>
                  </div>
                  <Navigation data-oid="3tyeu90" />
                </div>
              </header>
              <main className="pb-8" data-oid="7mtd9pq">
                {children}
              </main>
            </div>
          </AuthProvider>
        </AnnouncementModalProvider>
      </body>
    </html>
  );
}
