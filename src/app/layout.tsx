import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import Link from 'next/link';
import Image from 'next/image';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 overflow-x-hidden">
          <header className="bg-white shadow-sm relative z-10">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-4 pb-1 flex justify-between items-center"> {/* Added pb-1 for a small space */}
              <Link href="/" className="hover:text-blue-600 transition-colors">
                <div className="flex items-center">
                  <Image
                    // src="/images/tux_cat_favicon_1.png" 
                    // src="/images/tux_cat_favicon_2.png" 
                    src="/images/black_cat_stealth_favicon.png" 
                    alt="Site Logo"
                    width={28} // Reduced from 32
                    height={28} // Reduced from 32
                    className="mr-2 rounded-full" // Adds a small margin to the right of the logo
                  />
                  <h1 className="text-lg font-semibold text-gray-900">계양산 고양이들</h1>
                </div>
              </Link>
              <Navigation />
            </div>
          </header>
          <main className="pb-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}