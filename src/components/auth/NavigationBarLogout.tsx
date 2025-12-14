'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LogoutModal } from './LogoutModal';
import { cn } from '@/utils/cn';

export function NavigationBarLogout() {
  const { isAuthenticated, loading } = useAuth();
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

  return (
    <>
      <button
        onClick={handleLogoutClick}
        className={cn(
          "text-gray-600 hover:text-gray-900 transition-colors",
          "px-3 py-2 text-sm font-medium",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          "rounded-md hover:bg-gray-100"
        )}
      >
        Sign Out
      </button>

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={handleCloseModal}
      />
    </>
  );
}