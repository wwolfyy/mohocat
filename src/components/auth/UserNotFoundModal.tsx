'use client';

import React from 'react';
import { cn } from '@/utils/cn';

interface UserNotFoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAccount: () => void;
}

export default function UserNotFoundModal({
  isOpen,
  onClose,
  onCreateAccount,
}: UserNotFoundModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="text-center space-y-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
            <svg
              className="h-6 w-6 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h3 className="text-lg font-medium text-gray-900">Account Not Found</h3>

          <p className="text-sm text-gray-500">
            We couldn&apos;t find an account associated with this information.
          </p>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-left">
            <p className="text-xs text-yellow-700">
              <strong>Note:</strong> If you already have an account (via Email or Phone), please log
              in with that method first. Then, go to <strong>Settings</strong> to link your
              Google/Kakao account manually.
            </p>
          </div>

          <p className="text-sm text-gray-500">
            Otherwise, would you like to create a new account?
          </p>

          <div className="flex flex-col space-y-2 mt-4">
            <button
              onClick={onCreateAccount}
              className={cn(
                'w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white',
                'bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500'
              )}
            >
              Create Account
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Use Different Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
