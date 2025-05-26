import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mountain Cats',
  description: 'Explore cats living in the mountains',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1, // Optional: Prevents user zooming, can improve perceived stability
  },
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-0 flex justify-between items-center"> {/* Removed bottom padding */}
              <Link href="/" className="hover:text-blue-600 transition-colors">
                <h1 className="text-lg font-semibold text-gray-900">계양산 고양이들</h1>
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