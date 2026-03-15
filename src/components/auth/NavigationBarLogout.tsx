'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LogoutModal } from './LogoutModal';
import { cn } from '@/utils/cn';
import Link from 'next/link';
import { MdLogout } from 'react-icons/md';

export function NavigationBarLogout() {
  const { isAuthenticated, user } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleCloseModal = () => {
    setShowLogoutModal(false);
  };

  // Only show the logout button when user is logged in
  if (!isAuthenticated) {
    return null;
  }

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5',
        'bg-white border border-gray-200 rounded-full shadow-sm',
        'transition-all duration-200 hover:shadow-md hover:border-gray-300'
      )}
    >
      <Link
        href="/mypage"
        className="text-sm font-semibold text-gray-700 hover:text-blue-600 truncate max-w-[150px] transition-colors"
        title="My Page"
      >
        {displayName}
      </Link>

      <div className="h-4 w-px bg-gray-300 mx-1" aria-hidden="true" />

      <button
        onClick={handleLogoutClick}
        className={cn(
          'flex items-center justify-center p-1 rounded-full',
          'text-gray-500 hover:text-red-600 hover:bg-gray-100',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1'
        )}
        title="Sign Out"
        aria-label="Sign Out"
      >
        <MdLogout size={18} />
      </button>

      <LogoutModal isOpen={showLogoutModal} onClose={handleCloseModal} />
    </div>
  );
}
