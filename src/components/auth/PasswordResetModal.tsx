'use client';

import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import Modal from '@/components/ui/Modal';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  email?: string;
}

export default function PasswordResetModal({
  isOpen,
  onClose,
  email: initialEmail = '',
}: PasswordResetModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const { sendPasswordResetEmail } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(email);
      setIsSent(true);
    } catch (err: any) {
      console.error('Error sending password reset email:', err);
      let errorMessage = 'Failed to send password reset email.';

      if (err.code === 'auth/user-not-found') {
        // Security: commonly we don't reveal this, but current req is user friendly.
        // Let's stick to a generic message or be helpful if it's internal tool style.
        // Given the context of `LoginForm` showing specific errors, we might show specific here.
        // But standard practice is generic. Let's show generic but log specific.
        errorMessage = 'If an account exists with this email, a reset link has been sent.';
        // Actually for UX, seeing "Sent" is better even if not found (security best practice).
        // So let's treat user-not-found as success for the UI.
        setIsSent(true);
        return;
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsSent(false);
    setError('');
    setIsLoading(false);
    // Reset email only if it wasn't pre-filled? or just keep it.
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
          <svg
            className="h-6 w-6 text-brand-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.536 10.536 10 12l.172.172a2 2 0 01-.172 2.656l-.172.172a2 2 0 00-.586 1.414V18a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        </div>

        <h3 className="text-lg font-bold text-gray-900">Reset Password</h3>

        {!isSent ? (
          <>
            <p className="text-sm text-gray-500">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 text-left">
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={cn(
                  'w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2',
                  'text-gray-900 placeholder-gray-500',
                  'border-gray-300 hover:border-gray-400 focus:border-brand-400 focus:ring-brand-200'
                )}
                placeholder="Enter your email"
                disabled={isLoading}
              />

              {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  'mt-4 w-full rounded-lg bg-gradient-to-r from-brand to-accent px-4 py-2 text-sm font-semibold text-ink transition hover:shadow-md',
                  'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2',
                  { 'cursor-not-allowed opacity-70': isLoading }
                )}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-700">
                Check your email for a link to reset your password. If it doesn't appear within a
                few minutes, check your spam folder.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
