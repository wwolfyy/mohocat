'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link
              href="/"
              className={cn(
                "flex items-center px-2 py-2 text-gray-900 hover:text-gray-600",
                pathname === "/" && "text-blue-600"
              )}
            >
              Mountain Cats
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium",
                pathname === "/"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              Home
            </Link>
            <Link
              href="/about"
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium",
                pathname === "/about"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              About
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}