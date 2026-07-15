'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { strings } from '@/constants/strings';

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
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
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

        <h3 className="text-lg font-bold text-gray-900">{strings.auth.userNotFound.title}</h3>

        <p className="text-sm text-gray-500">{strings.auth.userNotFound.description}</p>

        <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4 text-left">
          <p className="text-xs text-yellow-700">
            <strong>{strings.auth.userNotFound.noteLabel}:</strong> {strings.auth.userNotFound.note}
          </p>
        </div>

        <p className="text-sm text-gray-500">{strings.auth.userNotFound.createPrompt}</p>

        <div className="mt-4 flex flex-col gap-2">
          <Button size="sm" className="w-full" onClick={onCreateAccount}>
            {strings.auth.userNotFound.create}
          </Button>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            {strings.auth.userNotFound.useDifferent}
          </button>
        </div>
      </div>
    </Modal>
  );
}
