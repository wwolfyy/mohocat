'use client';

import React from 'react';
import { cn } from '@/utils/cn';

interface SocialLoginButtonProps {
  provider: 'google' | 'kakao';
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SocialLoginButton: React.FC<SocialLoginButtonProps> = ({
  provider,
  onClick,
  loading = false,
  disabled = false,
  className,
  size = 'md',
}) => {
  const baseClasses = cn(
    'flex items-center justify-center gap-3 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
    'border-2 border-solid',
    {
      'cursor-not-allowed opacity-50': disabled || loading,
      'hover:shadow-lg transform hover:-translate-y-1': !disabled && !loading,
    },
    className
  );

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  const getButtonStyle = () => {
    switch (provider) {
      case 'google':
        return cn(
          baseClasses,
          sizeClasses[size],
          'bg-white text-gray-700 border-gray-300 hover:border-gray-400',
          'focus:ring-blue-500 focus:border-blue-500'
        );
      case 'kakao':
        return cn(
          baseClasses,
          sizeClasses[size],
          'bg-yellow-400 text-black border-yellow-500 hover:bg-yellow-300 hover:border-yellow-400',
          'focus:ring-yellow-500 focus:border-yellow-500'
        );
      default:
        return cn(baseClasses, sizeClasses[size]);
    }
  };

  const getIcon = () => {
    switch (provider) {
      case 'google':
        return (
          <svg
            className={cn('w-5 h-5', { 'animate-spin': loading })}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {loading ? (
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="#4285F4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="32"
                strokeDashoffset="32"
              >
                <animate
                  attributeName="stroke-dasharray"
                  dur="2s"
                  values="0 32;16 16;0 32;0 32"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="stroke-dashoffset"
                  dur="2s"
                  values="32;16;0;32"
                  repeatCount="indefinite"
                />
              </circle>
            ) : (
              <>
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.12l-2.8-2.16c-.84.56-1.84.88-3.26.88-2.48 0-4.48-2-4.48-4.48s2-4.48 4.48-4.48c1.4 0 2.4.32 3.26.88l2.8-2.16c.92 1 1.547 2.367 1.787 4.12H12.48v3.28H8.96v-3.28c0-3.64 2.84-6.48 6.48-6.48s6.48 2.84 6.48 6.48-2.84 6.48-6.48 6.48"
                  fill="#4285F4"
                />
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-1.84.88-3.26.88-2.48 0-4.48-2-4.48-4.48s2-4.48 4.48-4.48c1.4 0 2.4.32 3.26.88l2.8-2.16c.92 1 1.547 2.367 1.787 4.12H12.48v3.28H8.96v-3.28c0-3.64 2.84-6.48 6.48-6.48s6.48 2.84 6.48 6.48-2.84 6.48-6.48 6.48"
                  fill="#34A853"
                />
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-1.84.88-3.26.88-2.48 0-4.48-2-4.48-4.48s2-4.48 4.48-4.48c1.4 0 2.4.32 3.26.88l2.8-2.16c.92 1 1.547 2.367 1.787 4.12H12.48v3.28H8.96v-3.28c0-3.64 2.84-6.48 6.48-6.48s6.48 2.84 6.48 6.48-2.84 6.48-6.48 6.48"
                  fill="#FBBC05"
                />
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-1.84.88-3.26.88-2.48 0-4.48-2-4.48-4.48s2-4.48 4.48-4.48c1.4 0 2.4.32 3.26.88l2.8-2.16c.92 1 1.547 2.367 1.787 4.12H12.48v3.28H8.96v-3.28c0-3.64 2.84-6.48 6.48-6.48s6.48 2.84 6.48 6.48-2.84 6.48-6.48 6.48"
                  fill="#EA4335"
                />
              </>
            )}
          </svg>
        );
      case 'kakao':
        return (
          <div className="relative">
            {loading ? (
              <div className="w-5 h-5 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z"
                  fill="#FFEB00"
                />
                <path
                  d="M12 6c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
                  fill="#FFEB00"
                />
                <ellipse cx="12" cy="9.5" rx="1.5" ry="1.5" fill="#3A2400" />
                <path
                  d="M8.5 14.5c0-1.933 1.567-3.5 3.5-3.5s3.5 1.567 3.5 3.5"
                  stroke="#3A2400"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const getButtonText = () => {
    if (loading) {
      return provider === 'google' ? 'Signing in with Google...' : 'Signing in with Kakaotalk...';
    }
    return provider === 'google' ? 'Continue with Google' : 'Continue with Kakaotalk';
  };

  return (
    <button
      type="button"
      className={getButtonStyle()}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={getButtonText()}
      aria-describedby={`${provider}-button-desc`}
    >
      {getIcon()}
      <span className="whitespace-nowrap">{getButtonText()}</span>
      <span id={`${provider}-button-desc`} className="sr-only">
        {provider === 'google'
          ? 'Sign in using your Google account'
          : 'Sign in using your Kakaotalk account'}
      </span>
    </button>
  );
};

export default SocialLoginButton;
