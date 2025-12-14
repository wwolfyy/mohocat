'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';

export function NavigationBarLogin() {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();

  // Only show login button when user is not logged in (or is anonymous)
  if (isAuthenticated) {
    return null;
  }

  return (
    <Link
      href={`/login?redirect=${encodeURIComponent(pathname)}`}
      className={cn(
        "text-gray-600 hover:text-gray-900 transition-colors",
        "px-3 py-2 text-sm font-medium",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        "rounded-md hover:bg-gray-100",
        "bg-blue-500 hover:bg-blue-600 text-white"
      )}
    >
      Log In
    </Link>
  );
}