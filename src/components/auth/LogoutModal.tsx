'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import Modal from '@/components/ui/Modal';
import { strings } from '@/constants/strings';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogoutModal({ isOpen, onClose }: LogoutModalProps) {
  const { user, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      onClose();
    } catch (error) {
      console.error('Logout failed:', error);
      alert(strings.auth.logout.failed);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900">{strings.auth.logout.title}</h3>
        <p className="mt-2 text-gray-600">{strings.auth.logout.confirm}</p>
        {user && (
          <p className="mt-1 text-sm text-gray-500">
            {strings.auth.logout.signedInAs}{' '}
            <span className="font-medium text-gray-700">{user.email}</span>
          </p>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleCancel}
          className={cn(
            'flex-1 rounded-lg px-4 py-2 font-medium transition-colors',
            'bg-gray-100 text-gray-700 hover:bg-gray-200',
            'focus:outline-none focus:ring-2 focus:ring-gray-400'
          )}
          disabled={isLoggingOut}
        >
          {strings.common.cancel}
        </button>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            'flex-1 rounded-lg px-4 py-2 font-medium text-white transition-colors',
            'bg-red-500 hover:bg-red-600',
            'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {isLoggingOut ? (
            <div className="flex items-center justify-center">
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {strings.auth.logout.submitting}
            </div>
          ) : (
            strings.auth.logout.submit
          )}
        </button>
      </div>
    </Modal>
  );
}
