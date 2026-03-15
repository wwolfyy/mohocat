'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import { MdLogin } from 'react-icons/md';

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
        'flex items-center gap-2 px-3 py-1.5',
        'bg-white border border-gray-200 rounded-full shadow-sm',
        'text-sm font-semibold text-gray-700',
        'transition-all duration-200 hover:shadow-md hover:border-gray-300 hover:text-blue-600'
      )}
    >
      <span>Log In</span>
      <MdLogin size={18} />
    </Link>
  );
}
