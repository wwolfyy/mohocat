'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';

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
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
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

        <h3 className="text-lg font-bold text-gray-900">Account Not Found</h3>

        <p className="text-sm text-gray-500">
          We couldn't find an account associated with this information.
        </p>

        <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4 text-left">
          <p className="text-xs text-yellow-700">
            <strong>Note:</strong> If you already have an account (via Email or Phone), please log
            in with that method first. Then, go to <strong>Settings</strong> to link your
            Google/Kakao account manually.
          </p>
        </div>

        <p className="text-sm text-gray-500">Otherwise, would you like to create a new account?</p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={onCreateAccount}
            className="w-full rounded-lg bg-gradient-to-r from-brand to-accent px-4 py-2 text-sm font-semibold text-ink transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
          >
            Create Account
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Use Different Login
          </button>
        </div>
      </div>
    </Modal>
  );
}
