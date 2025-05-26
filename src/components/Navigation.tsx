'use client';

import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="flex items-center space-x-6">
      <Link
        href="/about"
        className="text-gray-600 hover:text-gray-900 transition-colors"
      >
        소개
      </Link>
      <Link
        href="/contact"
        className="text-gray-600 hover:text-gray-900 transition-colors"
      >
        동참
      </Link>
    </nav>
  );
}