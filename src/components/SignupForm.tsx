'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

interface SignupFormProps {
  onSignupSuccess?: () => void;
  onSignupError?: (error: string) => void;
}

const SignupForm: React.FC<SignupFormProps> = ({
  onSignupSuccess,
  onSignupError,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { createUser, clearErrors } = useAuth();

  const validateForm = () => {
    if (!email || !password || !confirmPassword) {
      return 'Please fill in all fields.';
    }
    
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    
    if (password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      onSignupError?.(validationError);
      return;
    }

    setIsLoading(true);
    clearErrors();

    try {
      await createUser(email, password);
      onSignupSuccess?.();
    } catch (error: any) {
      console.error('Signup error:', error);
      onSignupError?.(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={cn(
            "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors",
            "text-gray-900 placeholder-gray-500",
            "border-gray-300 hover:border-gray-400 focus:border-transparent focus:ring-yellow-500"
          )}
          placeholder="Enter your email address"
          disabled={isLoading}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={cn(
            "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors",
            "text-gray-900 placeholder-gray-500",
            "border-gray-300 hover:border-gray-400 focus:border-transparent focus:ring-yellow-500"
          )}
          placeholder="Enter your password"
          disabled={isLoading}
          minLength={6}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Confirm Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={cn(
            "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors",
            "text-gray-900 placeholder-gray-500",
            "border-gray-300 hover:border-gray-400 focus:border-transparent focus:ring-yellow-500"
          )}
          placeholder="Confirm your password"
          disabled={isLoading}
          minLength={6}
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          "w-full px-4 py-2 rounded-lg font-medium text-white transition-colors",
          "bg-yellow-500 hover:bg-yellow-600",
          "focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin mr-2"></div>
            Creating Account...
          </div>
        ) : (
          "Create Account"
        )}
      </button>
    </form>
  );
};

export default SignupForm;