'use client';

import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl relative animate-fadeIn">
        <button
          onClick={handleClose}
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
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
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

          <h3 className="text-lg font-medium text-gray-900">Reset Password</h3>

          {!isSent ? (
            <>
              <p className="text-sm text-gray-500">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="mt-4 text-left">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors',
                    'text-gray-900 placeholder-gray-500',
                    'border-gray-300 hover:border-gray-400 focus:border-transparent focus:ring-blue-500'
                  )}
                  placeholder="Enter your email"
                  disabled={isLoading}
                />

                {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}

                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      'w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white',
                      'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                      { 'opacity-70 cursor-not-allowed': isLoading }
                    )}
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-700 text-sm">
                  Check your email for a link to reset your password. If it doesn't appear within a
                  few minutes, check your spam folder.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
