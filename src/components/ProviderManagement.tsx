'use client';

import React from 'react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import type { ProviderData } from '@/services/interfaces';

interface ProviderManagementProps {
  className?: string;
  showSuccessMessages?: boolean;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

const ProviderManagement: React.FC<ProviderManagementProps> = ({
  className,
  showSuccessMessages = true,
  onError,
  onSuccess,
}) => {
  const {
    providerData,
    linkedProviders,
    canLinkKakao,
    isLinkingKakao,
    isUnlinkingProvider,
    linkProviderError,
    unlinkProviderError,
    linkProviderSuccess,
    unlinkProviderSuccess,
    linkKakaoProvider,
    unlinkProvider,
    clearErrors,
    clearSuccess,
  } = useAuth();

  const getProviderDisplayName = (providerId: string): string => {
    switch (providerId) {
      case 'google.com':
        return 'Google';
      case 'https://kakao.com':
      case 'oidc.kakao':
        return 'Kakaotalk';
      default:
        return providerId;
    }
  };

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'google.com':
        return (
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.12l-2.8-2.16c-.84.56-1.84.88-3.26.88-2.48 0-4.48-2-4.48-4.48s2-4.48 4.48-4.48c1.4 0 2.4.32 3.26.88l2.8-2.16c.92 1 1.547 2.367 1.787 4.12H12.48v3.28H8.96v-3.28c0-3.64 2.84-6.48 6.48-6.48s6.48 2.84 6.48 6.48-2.84 6.48-6.48 6.48"
              fill="#4285F4"
            />
            <path
              d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.12l-2.8-2.16c-.84.56-1.84.88-3.26.88-2.48 0-4.48-2-4.48-4.48s2-4.48 4.48-4.48c1.4 0 2.4.32 3.26.88l2.8-2.16c.92 1 1.547 2.367 1.787 4.12H12.48v3.28H8.96v-3.28c0-3.64 2.84-6.48 6.48-6.48s6.48 2.84 6.48 6.48-2.84 6.48-6.48 6.48"
              fill="#34A853"
            />
            <path
              d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.12l-2.8-2.16c-.84.56-1.84.88-3.26.88-2.48 0-4.48-2-4.48-4.48s2-4.48 4.48-4.48c1.4 0 2.4.32 3.26.88l2.8-2.16c.92 1 1.547 2.367 1.787 4.12H12.48v3.28H8.96v-3.28c0-3.64 2.84-6.48 6.48-6.48s6.48 2.84 6.48 6.48-2.84 6.48-6.48 6.48"
              fill="#FBBC05"
            />
            <path
              d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.12l-2.8-2.16c-.84.56-1.84.88-3.26.88-2.48 0-4.48-2-4.48-4.48s2-4.48 4.48-4.48c1.4 0 2.4.32 3.26.88l2.8-2.16c.92 1 1.547 2.367 1.787 4.12H12.48v3.28H8.96v-3.28c0-3.64 2.84-6.48 6.48-6.48s6.48 2.84 6.48 6.48-2.84 6.48-6.48 6.48"
              fill="#EA4335"
            />
          </svg>
        );
      case 'https://kakao.com':
      case 'oidc.kakao':
        return (
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
              d="M12 6c-3.314 0-6 2.686-6 6s1.567 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
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
        );
      default:
        return null;
    }
  };

  const handleLinkProvider = async (providerId: string) => {
    clearErrors();
    console.log('[ProviderManagement] handleLinkProvider clicked for:', providerId);

    try {
      if (providerId === 'oidc.kakao' || providerId === 'https://kakao.com') {
        await linkKakaoProvider();
        onSuccess?.('Successfully linked Kakaotalk account');
      }
    } catch (error) {
      // Error is handled by the hook
      onError?.(linkProviderError || 'Failed to link provider');
    }
  };

  const handleUnlinkProvider = async (providerId: string) => {
    console.log('[ProviderManagement] handleUnlinkProvider clicked for:', providerId);
    clearErrors();

    try {
      await unlinkProvider(providerId);
      console.log('[ProviderManagement] unlinkProvider completed.');
      onSuccess?.('Successfully unlinked provider');
    } catch (error) {
      console.error('[ProviderManagement] Error during unlinkProvider:', error);
      // Error is handled by the hook
      onError?.(unlinkProviderError || 'Failed to unlink provider');
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Section Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Connected Accounts</h3>
        <p className="text-sm text-gray-600">
          Manage your social login providers. You can link multiple accounts for easier access.
        </p>
      </div>

      {/* Success Messages */}
      {showSuccessMessages && (linkProviderSuccess || unlinkProviderSuccess) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                {linkProviderSuccess && 'Provider linked successfully!'}
                {unlinkProviderSuccess && 'Provider unlinked successfully!'}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1">
                <button
                  onClick={() => clearSuccess()}
                  className="inline-flex rounded-md bg-green-50 p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.28 3.28a.75.75 0 00-1.06 1.06L8.94 10l-5.72 5.72a.75.75 0 001.06 1.06L10 10.06l5.72 5.72a.75.75 0 001.06-1.06L10.06 10 15.72-5.72a.75.75 0 00-1.06-1.06L10 8.94 4.28 3.28Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {(linkProviderError || unlinkProviderError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 11-1.414-1.414L7.172 10l-1.293-1.293a1 1 0 011.414-1.414L10 8.707l1.293-1.293a1 1 0 011.414 1.414L12.707 10l1.293 1.293a1 1 0 11-1.414 1.414L11.414 10l1.293-1.293a1 1 0 011.414-1.414L10 8.707l-1.293-1.293Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">
                {linkProviderError || unlinkProviderError}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1">
                <button
                  onClick={() => clearErrors()}
                  className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.28 3.28a.75.75 0 00-1.06 1.06L8.94 10l-5.72 5.72a.75.75 0 001.06 1.06L10 10.06l5.72 5.72a.75.75 0 001.06-1.06L10.06 10 15.72-5.72a.75.75 0 00-1.06-1.06L10 8.94 4.28 3.28Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Linked Providers */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-700">Linked Providers</h4>

        {providerData.length > 0 ? (
          <div className="space-y-3">
            {providerData.map((provider) => (
              <div
                key={provider.providerId}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">{getProviderIcon(provider.providerId)}</div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {getProviderDisplayName(provider.providerId)}
                    </div>
                    {provider.email && (
                      <div className="text-sm text-gray-500">{provider.email}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleUnlinkProvider(provider.providerId)}
                  disabled={isUnlinkingProvider}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2',
                    isUnlinkingProvider
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500'
                  )}
                >
                  {isUnlinkingProvider ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Unlinking...
                    </div>
                  ) : (
                    'Unlink'
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <div className="text-gray-500">No social accounts linked yet.</div>
          </div>
        )}
      </div>

      {/* Available Providers to Link */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-700">Available Providers</h4>

        <div className="space-y-3">
          {/* Google Provider */}
          {/* Google Provider Removed */}

          {/* Kakaotalk Provider */}
          {canLinkKakao && (
            <button
              onClick={() => handleLinkProvider('oidc.kakao')}
              disabled={isLinkingKakao}
              className={cn(
                'w-full flex items-center justify-between p-4 border-2 rounded-lg transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                'bg-yellow-50 text-black border-yellow-300 hover:border-yellow-400',
                'focus:ring-yellow-500 hover:shadow-md',
                isLinkingKakao && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-center space-x-3">
                <div>{getProviderIcon('https://kakao.com')}</div>
                <span className="font-medium">Link Kakaotalk Account</span>
              </div>
              {isLinkingKakao ? (
                <div className="w-5 h-5 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg
                  className="w-5 h-5 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              )}
            </button>
          )}

          {/* No providers available to link */}
          {!canLinkKakao && providerData.length > 0 && (
            <div className="text-center py-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">
                All available providers are already linked to your account.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderManagement;
