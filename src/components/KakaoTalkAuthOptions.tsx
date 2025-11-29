'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

interface KakaoTalkAuthOptionsProps {
  onAuthSuccess?: () => void;
  onAuthError?: (error: string) => void;
}

const KakaoTalkAuthOptions: React.FC<KakaoTalkAuthOptionsProps> = ({
  onAuthSuccess,
  onAuthError,
}) => {
  const [showCreateWarning, setShowCreateWarning] = useState(false);

  const {
    linkProvider,
    linkProviderError,
    linkProviderSuccess,
    isLinkingKakao,
    clearErrors,
  } = useAuth();

  const handleShowCreateWarning = () => {
    setShowCreateWarning(true);
  };

  const handleHideCreateWarning = () => {
    setShowCreateWarning(false);
    clearErrors();
  };

  const handleLinkKakao = async () => {
    try {
      await linkProvider('https://kakao.com');
      onAuthSuccess?.();
    } catch (error: any) {
      onAuthError?.(error.message || 'Failed to link KakaoTalk account');
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">KakaoTalk Authentication</h3>
          <p className="text-sm text-gray-500">Link your KakaoTalk account to your existing account</p>
        </div>

        <div className="space-y-3">
          {/* Disabled Create Account Button with Warning */}
          <button
            onClick={handleShowCreateWarning}
            disabled={true}
            className={cn(
              "w-full p-4 rounded-lg border-2 transition-all duration-200 text-left",
              "border-gray-300 bg-gray-100 cursor-not-allowed",
              "hover:bg-gray-100"
            )}
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-500">Create Account with KakaoTalk</div>
                <div className="text-sm text-gray-400 mt-1">
                  Direct account creation with KakaoTalk is not currently supported.
                </div>
              </div>
            </div>
          </button>

          {/* Link to Existing Account Button */}
          <button
            onClick={handleLinkKakao}
            disabled={isLinkingKakao}
            className={cn(
              "w-full p-4 rounded-lg border-2 transition-all duration-200 text-left",
              "border-blue-300 bg-blue-50 hover:bg-blue-100",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              "hover:shadow-md hover:-translate-y-1",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-50 disabled:hover:shadow-none disabled:hover:translate-y-0"
            )}
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Link KakaoTalk to Existing Account</div>
                <div className="text-sm text-gray-600 mt-1">
                  Link your KakaoTalk account to your existing account for easier future logins.
                </div>
              </div>
              {isLinkingKakao && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </button>
        </div>

        {/* Warning Modal for Create Account */}
        {showCreateWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create Account with KakaoTalk</h3>
                <button
                  onClick={handleHideCreateWarning}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justifycenter flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-yellow-900">Feature Not Available</div>
                      <div className="text-sm text-yellow-700 mt-1">
                        KakaoTalk authentication doesn't support direct user creation. This is a limitation of KakaoTalk's OAuth implementation.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Recommended Workflow:</h4>
                  <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                    <li>Create an account using email and password</li>
                    <li>After logging in, link your KakaoTalk account</li>
                    <li>Enjoy seamless future logins with KakaoTalk</li>
                  </ol>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleHideCreateWarning}
                    className="flex-1 px-4 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Got It
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {linkProviderError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{linkProviderError}</p>
          </div>
        )}

        {/* Success Messages */}
        {linkProviderSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-700 text-sm">KakaoTalk linked successfully!</p>
          </div>
        )}

        <div className="text-xs text-gray-400 text-center mt-3">
          First create an account with email/password, then link your KakaoTalk account for future convenience
        </div>
      </div>
    </>
  );
};

export default KakaoTalkAuthOptions;