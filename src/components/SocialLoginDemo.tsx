'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/LoginForm';
import ProviderManagement from '@/components/ProviderManagement';
import SocialLoginButton from '@/components/SocialLoginButton';
import KakaoTalkDebug from '@/components/KakaoTalkDebug';
import { cn } from '@/utils/cn';

interface SocialLoginDemoProps {
  className?: string;
}

const SocialLoginDemo: React.FC<SocialLoginDemoProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'providers' | 'demo' | 'debug'>('demo');
  const {
    user,
    isAuthenticated,
    providerData,
    linkedProviders,
    signInWithKakao,
    isSigningInWithKakao,
    kakaoSignInError,
    kakaoSignInSuccess,
  } = useAuth();

  const handleLoginSuccess = () => {
    console.log('Login successful in demo');
    setActiveTab('providers');
  };

  const handleLoginError = (error: string) => {
    console.error('Login error in demo:', error);
  };

  return (
    <div className={cn('max-w-4xl mx-auto p-6 space-y-6', className)}>
      {/* Demo Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Mountain Cat Tracking Platform</h1>
        <h2 className="text-xl font-semibold text-gray-700">Social Login Demo</h2>
        <p className="text-gray-600">
          Experience enhanced authentication with Google and Kakaotalk OAuth
        </p>
      </div>

      {/* User Status */}
      {isAuthenticated && user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user.displayName?.charAt(0).toUpperCase() ||
                    user.email?.charAt(0).toUpperCase() ||
                    '?'}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900">{user.displayName || 'User'}</div>
                <div className="text-sm text-gray-600">{user.email}</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Authenticated with {linkedProviders.length} provider(s)
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'demo', label: 'Live Demo', icon: '🎮' },
            { id: 'login', label: 'Login Form', icon: '🔑' },
            { id: 'providers', label: 'Provider Management', icon: '⚙️' },
            { id: 'debug', label: 'Kakao Debug', icon: '🐛' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Live Demo Tab */}
        {activeTab === 'demo' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Interactive Demo</h3>
              <p className="text-gray-600 mb-4">
                Try the social login buttons below to see them in action.
              </p>

              <div className="space-y-4">
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-3">
                    Standalone Social Login Buttons
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <SocialLoginButton
                      provider="kakao"
                      onClick={signInWithKakao}
                      loading={isSigningInWithKakao}
                      size="md"
                    />
                  </div>
                </div>

                {user && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-800 mb-2">
                      Authentication Status
                    </h4>
                    <div className="text-sm text-green-700">
                      <p>
                        <strong>Authenticated:</strong> Yes
                      </p>
                      <p>
                        <strong>Display Name:</strong> {user.displayName || 'Not provided'}
                      </p>
                      <p>
                        <strong>Email:</strong> {user.email}
                      </p>
                      <p>
                        <strong>Linked Providers:</strong> {linkedProviders.join(', ') || 'None'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Success Messages */}
                {kakaoSignInSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-green-700 text-sm text-center">
                      ✅ Successfully signed in with Kakaotalk!
                    </p>
                  </div>
                )}

                {/* Error Messages */}
                {kakaoSignInError && (
                  <div className="space-y-2">
                    {kakaoSignInError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-700 text-sm">
                          ❌ Kakaotalk Sign-in Error: {kakaoSignInError}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Features Showcase */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Features Demonstrated</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">🎨 Beautiful Design</h4>
                  <p className="text-sm text-blue-800">
                    Custom SVG icons with provider-specific colors and hover effects
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">🔄 Loading States</h4>
                  <p className="text-sm text-green-800">
                    Smooth loading animations and disabled states during OAuth operations
                  </p>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 mb-2">🛡️ Error Handling</h4>
                  <p className="text-sm text-yellow-800">
                    Comprehensive error messages for common OAuth failure scenarios
                  </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-2">📱 Responsive</h4>
                  <p className="text-sm text-purple-800">
                    Mobile-friendly design that works on all screen sizes
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Login Form Tab */}
        {activeTab === 'login' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enhanced Login Form</h3>
              <p className="text-gray-600 mb-4">
                Complete login form with social authentication options and traditional
                email/password login.
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <LoginForm onLoginSuccess={handleLoginSuccess} onLoginError={handleLoginError} />
            </div>
          </div>
        )}

        {/* KakaoTalk Debug Tab */}
        {activeTab === 'debug' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">KakaoTalk Debug Console</h3>
              <p className="text-gray-600 mb-4">
                Advanced debugging tools for KakaoTalk OAuth implementation. Use this to diagnose
                and fix authentication issues.
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <KakaoTalkDebug />
            </div>
          </div>
        )}

        {/* Provider Management Tab */}
        {activeTab === 'providers' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Provider Management</h3>
              <p className="text-gray-600 mb-4">
                Manage your connected OAuth providers and link/unlink accounts.
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <ProviderManagement
                showSuccessMessages={true}
                onError={(error) => console.error('Provider error:', error)}
                onSuccess={(message) => console.log('Provider success:', message)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Implementation Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Implementation Details</h3>

        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-3">Technologies Used:</h4>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>Next.js 14 with React 18</li>
            <li>Firebase Authentication with OAuth providers</li>
            <li>Google OAuth (google.com provider)</li>
            <li>Kakaotalk OAuth (https://kakao.com provider)</li>
            <li>Tailwind CSS for styling</li>
            <li>TypeScript for type safety</li>
            <li>Custom hooks for state management</li>
          </ul>

          <h4 className="font-semibold text-gray-900 mt-4 mb-3">Components Created:</h4>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>
              <code>useAuth</code> - Enhanced authentication hook with OAuth support
            </li>
            <li>
              <code>SocialLoginButton</code> - Reusable social login buttons
            </li>
            <li>
              <code>LoginForm</code> - Enhanced login form with social options
            </li>
            <li>
              <code>ProviderManagement</code> - OAuth provider management interface
            </li>
            <li>
              <code>AdminAuth</code> - Enhanced admin authentication wrapper
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SocialLoginDemo;
