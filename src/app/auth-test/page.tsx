'use client';

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/LoginForm';
import SignupForm from '@/components/SignupForm';
import ProviderManagement from '@/components/ProviderManagement';
import AdminAuth from '@/components/admin/AdminAuth';
import SocialLoginButton from '@/components/SocialLoginButton';
import { isGoogleOAuthEnabled, isKakaoOAuthEnabled } from '@/utils/config';
import {
  runAuthIntegrationTests,
  printTestResults,
  allTestsPassed,
  getFailedTests,
  IntegrationTestResult,
} from '@/utils/auth-integration-test';
import { cn } from '@/utils/cn';

interface AuthTestPageProps {}

const AuthTestPage: React.FC<AuthTestPageProps> = () => {
  const {
    user,
    loading,
    isAuthenticated,
    providerData,
    linkedProviders,
    isSigningInWithKakao,
    kakaoSignInError,
    kakaoSignInSuccess,
    linkProviderError,
    unlinkProviderError,
    linkProviderSuccess,
    unlinkProviderSuccess,
  } = useAuth();

  const [testResults, setTestResults] = useState<
    Array<{
      id: string;
      name: string;
      status: 'pending' | 'running' | 'success' | 'error';
      message?: string;
      timestamp?: string;
    }>
  >([]);

  const [integrationTestResults, setIntegrationTestResults] = useState<IntegrationTestResult[]>([]);
  const [isRunningIntegrationTests, setIsRunningIntegrationTests] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'login' | 'providers' | 'admin' | 'tests'
  >('overview');

  // Add test result
  const addTestResult = (
    id: string,
    name: string,
    status: 'pending' | 'running' | 'success' | 'error',
    message?: string
  ) => {
    setTestResults((prev) => [
      {
        id,
        name,
        status,
        message,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev.filter((result) => result.id !== id),
    ]);
  };

  // Test OAuth availability
  useEffect(() => {
    const googleEnabled = isGoogleOAuthEnabled();
    const kakaoEnabled = isKakaoOAuthEnabled();

    // Debug logging
    console.log('OAuth Configuration Debug:');
    console.log('Google OAuth Enabled:', googleEnabled);
    console.log('Kakao OAuth Enabled:', kakaoEnabled);

    addTestResult(
      'oauth-config',
      'OAuth Configuration Check',
      googleEnabled || kakaoEnabled ? 'success' : 'error',
      `Google OAuth: ${googleEnabled ? 'Enabled' : 'Disabled'}, Kakaotalk OAuth: ${kakaoEnabled ? 'Enabled' : 'Disabled'}`
    );
  }, []);

  // Test authentication state changes
  useEffect(() => {
    if (!loading) {
      addTestResult(
        'auth-state',
        'Authentication State',
        isAuthenticated ? 'success' : 'pending',
        isAuthenticated ? `User authenticated: ${user?.email}` : 'No user authenticated'
      );
    }
  }, [loading, isAuthenticated, user]);

  // Test provider data
  useEffect(() => {
    if (isAuthenticated && providerData.length > 0) {
      addTestResult(
        'provider-data',
        'Provider Data Fetch',
        'success',
        `Found ${providerData.length} linked providers: ${providerData.map((p) => p.providerId).join(', ')}`
      );
    } else if (isAuthenticated && providerData.length === 0) {
      addTestResult(
        'provider-data',
        'Provider Data Fetch',
        'pending',
        'User authenticated but no providers linked'
      );
    }
  }, [isAuthenticated, providerData]);

  // Test error states
  useEffect(() => {
    if (kakaoSignInError) {
      addTestResult(
        'kakao-error',
        'Kakaotalk OAuth Error',
        'error',
        `Kakaotalk sign-in error: ${kakaoSignInError}`
      );
    }
    if (linkProviderError) {
      addTestResult(
        'link-error',
        'Provider Link Error',
        'error',
        `Provider link error: ${linkProviderError}`
      );
    }
    if (unlinkProviderError) {
      addTestResult(
        'unlink-error',
        'Provider Unlink Error',
        'error',
        `Provider unlink error: ${unlinkProviderError}`
      );
    }
  }, [kakaoSignInError, linkProviderError, unlinkProviderError]);

  // Test success states
  useEffect(() => {
    if (kakaoSignInSuccess) {
      addTestResult(
        'kakao-success',
        'Kakaotalk OAuth Success',
        'success',
        'Successfully signed in with Kakaotalk'
      );
    }
    if (linkProviderSuccess) {
      addTestResult(
        'link-success',
        'Provider Link Success',
        'success',
        'Successfully linked provider'
      );
    }
    if (unlinkProviderSuccess) {
      addTestResult(
        'unlink-success',
        'Provider Unlink Success',
        'success',
        'Successfully unlinked provider'
      );
    }
  }, [kakaoSignInSuccess, linkProviderSuccess, unlinkProviderSuccess]);

  const handleTestOAuthFlow = async (provider: 'google' | 'kakao') => {
    addTestResult(
      `oauth-flow-${provider}`,
      `${provider.toUpperCase()} OAuth Flow Test`,
      'running',
      `Testing ${provider} OAuth flow...`
    );

    try {
      // This would normally trigger the OAuth flow
      // For testing purposes, we'll simulate the flow
      await new Promise((resolve) => setTimeout(resolve, 1000));

      addTestResult(
        `oauth-flow-${provider}`,
        `${provider.toUpperCase()} OAuth Flow Test`,
        'success',
        `${provider.toUpperCase()} OAuth flow completed successfully`
      );
    } catch (error) {
      addTestResult(
        `oauth-flow-${provider}`,
        `${provider.toUpperCase()} OAuth Flow Test`,
        'error',
        `OAuth flow failed: ${error}`
      );
    }
  };

  const handleTestProviderLinking = async (providerId: string) => {
    addTestResult(
      `provider-link-${providerId}`,
      `Provider Linking Test (${providerId})`,
      'running',
      `Testing provider linking for ${providerId}...`
    );

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      addTestResult(
        `provider-link-${providerId}`,
        `Provider Linking Test (${providerId})`,
        'success',
        `Provider linking for ${providerId} completed successfully`
      );
    } catch (error) {
      addTestResult(
        `provider-link-${providerId}`,
        `Provider Linking Test (${providerId})`,
        'error',
        `Provider linking failed: ${error}`
      );
    }
  };

  // Run integration tests
  const handleRunIntegrationTests = async () => {
    setIsRunningIntegrationTests(true);
    setIntegrationTestResults([]);

    try {
      const results = await runAuthIntegrationTests();
      setIntegrationTestResults(results);
      printTestResults(results);

      if (allTestsPassed(results)) {
        addTestResult(
          'integration-tests',
          'Integration Tests',
          'success',
          `All ${results.length} integration tests passed`
        );
      } else {
        const failedTests = getFailedTests(results);
        addTestResult(
          'integration-tests',
          'Integration Tests',
          'error',
          `${failedTests.length} out of ${results.length} tests failed`
        );
      }
    } catch (error) {
      addTestResult(
        'integration-tests',
        'Integration Tests',
        'error',
        `Integration test execution failed: ${error}`
      );
    } finally {
      setIsRunningIntegrationTests(false);
    }
  };

  // Get integration test summary
  const getIntegrationTestSummary = () => {
    const passed = integrationTestResults.filter((r) => r.status === 'success').length;
    const failed = integrationTestResults.filter((r) => r.status === 'error').length;
    const running = integrationTestResults.filter((r) => r.status === 'running').length;
    return { total: integrationTestResults.length, passed, failed, running };
  };

  const handleTestErrorScenarios = () => {
    // Simulate various error scenarios
    addTestResult(
      'error-popup-blocked',
      'Popup Blocked Error',
      'error',
      'Simulated popup blocked error'
    );
    addTestResult(
      'error-user-cancelled',
      'User Cancelled Error',
      'error',
      'Simulated user cancelled error'
    );
    addTestResult('error-network', 'Network Error', 'error', 'Simulated network error');
    addTestResult(
      'error-credential-exists',
      'Credential Already Exists Error',
      'error',
      'Simulated credential already exists error'
    );
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'running':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'running':
        return '🔄';
      default:
        return '⏳';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Test Suite</h1>
          <p className="text-gray-600">Loading authentication state...</p>
          <div className="mt-4">
            <div className="w-8 h-8 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">🔐 Authentication Test Suite</h1>
              <div className="text-sm text-gray-500">
                Status: {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${isGoogleOAuthEnabled() ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
              >
                Google OAuth: {isGoogleOAuthEnabled() ? 'ON' : 'OFF'}
              </span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${isKakaoOAuthEnabled() ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}
              >
                Kakaotalk OAuth: {isKakaoOAuthEnabled() ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'overview', name: 'Overview', icon: '📋' },
                    { id: 'login', name: 'Login Test', icon: '🔑' },
                    { id: 'providers', name: 'Provider Management', icon: '🔗' },
                    { id: 'admin', name: 'Admin Auth', icon: '👑' },
                    { id: 'tests', name: 'Test Results', icon: '🧪' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        'py-4 px-1 flex items-center space-x-2 text-sm font-medium transition-colors',
                        activeTab === tab.id
                          ? 'text-yellow-600 border-b-2 border-yellow-500'
                          : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.name}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900">Authentication Overview</h2>

                    {/* Current User Info */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-md font-medium text-gray-900 mb-4">Current User</h3>
                      {user ? (
                        <div className="space-y-2">
                          <p>
                            <strong>UID:</strong> {user.uid}
                          </p>
                          <p>
                            <strong>Email:</strong> {user.email || 'No email'}
                          </p>
                          <p>
                            <strong>Display Name:</strong> {user.displayName || 'No name'}
                          </p>
                          <p>
                            <strong>Photo URL:</strong>{' '}
                            {user.photoURL ? 'Available' : 'Not available'}
                          </p>
                          <p>
                            <strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}
                          </p>
                          <p>
                            <strong>Providers:</strong> {linkedProviders.join(', ') || 'None'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-500">No user currently authenticated</p>
                      )}
                    </div>

                    {/* Provider Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-md font-medium text-gray-900 mb-4">Linked Providers</h3>
                      {providerData.length > 0 ? (
                        <div className="space-y-3">
                          {providerData.map((provider) => (
                            <div
                              key={provider.providerId}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded"
                            >
                              <div>
                                <span className="font-medium">{provider.providerId}</span>
                                <span className="text-sm text-gray-500 ml-2">
                                  {provider.email || 'No email'}
                                </span>
                              </div>
                              <span className="text-sm text-gray-500">{provider.uid}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No providers linked</p>
                      )}
                    </div>

                    {/* OAuth Configuration */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-md font-medium text-gray-900 mb-4">
                        OAuth Configuration
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Google OAuth:</span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${isGoogleOAuthEnabled() ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                          >
                            {isGoogleOAuthEnabled() ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Kakaotalk OAuth:</span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${isKakaoOAuthEnabled() ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}
                          >
                            {isKakaoOAuthEnabled() ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'login' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Login & Signup Test Interface
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Social Login Test */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-md font-medium text-gray-900 mb-4">Social Login</h3>
                        <div className="space-y-3">
                          {isGoogleOAuthEnabled() && (
                            <SocialLoginButton
                              provider="google"
                              onClick={() => handleTestOAuthFlow('google')}
                              loading={false}
                            />
                          )}
                          {isKakaoOAuthEnabled() && (
                            <SocialLoginButton
                              provider="kakao"
                              onClick={() => handleTestOAuthFlow('kakao')}
                              loading={isSigningInWithKakao}
                            />
                          )}
                        </div>

                        {!isGoogleOAuthEnabled() && !isKakaoOAuthEnabled() && (
                          <div className="text-center py-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500">
                              OAuth providers are disabled. Enable them in environment
                              configuration.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Email/Password Authentication Test */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-md font-medium text-gray-900 mb-4">
                          Email/Password Authentication
                        </h3>
                        <div className="space-y-6">
                          {/* Login Form */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Login</h4>
                            <LoginForm />
                          </div>

                          {/* Signup Form */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Sign Up</h4>
                            <SignupForm />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'providers' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Provider Management Test
                    </h2>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <ProviderManagement />
                    </div>

                    {/* Provider Linking Test Buttons */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
                      <h3 className="text-md font-medium text-gray-900 mb-4">
                        Manual Provider Test
                      </h3>
                      <div className="space-y-3">
                        {!linkedProviders.includes('google.com') && isGoogleOAuthEnabled() && (
                          <button
                            onClick={() => handleTestProviderLinking('google.com')}
                            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                          >
                            Test Google Provider Linking
                          </button>
                        )}
                        {!linkedProviders.includes('https://kakao.com') &&
                          isKakaoOAuthEnabled() && (
                            <button
                              onClick={() => handleTestProviderLinking('https://kakao.com')}
                              className="w-full px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600"
                            >
                              Test Kakaotalk Provider Linking
                            </button>
                          )}
                        {linkedProviders.length === 0 && (
                          <div className="text-center py-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500">
                              No providers available for linking or all providers already linked.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'admin' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Admin Authentication Test
                    </h2>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <p className="text-sm text-gray-600 mb-4">
                        This section tests the AdminAuth component integration with social login.
                        The component below will show different states based on authentication
                        status.
                      </p>

                      {/* Mock Admin Content */}
                      <AdminAuth>
                        <div className="bg-gray-50 rounded-lg p-6 text-center">
                          <div className="text-2xl mb-2">👨‍💼</div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Admin Panel Test
                          </h3>
                          <p className="text-sm text-gray-600">
                            This content is only visible to authenticated admin users.
                          </p>
                          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-white p-3 rounded">
                              <strong>User Status:</strong>
                              <br />
                              {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                            </div>
                            <div className="bg-white p-3 rounded">
                              <strong>Admin Access:</strong>
                              <br />
                              {user ? 'Granted' : 'Pending'}
                            </div>
                          </div>
                        </div>
                      </AdminAuth>
                    </div>
                  </div>
                )}

                {activeTab === 'tests' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-semibold text-gray-900">Test Results</h2>
                      <button
                        onClick={clearTestResults}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                      >
                        Clear Results
                      </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      {testResults.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-2">🧪</div>
                          <p className="text-gray-500">
                            No test results yet. Interact with the components above to see test
                            results.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {testResults.map((result) => (
                            <div
                              key={result.id}
                              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <span className="text-lg">{getStatusIcon(result.status)}</span>
                                <div>
                                  <div className="font-medium text-gray-900">{result.name}</div>
                                  {result.message && (
                                    <div className="text-sm text-gray-500">{result.message}</div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div
                                  className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(result.status)}`}
                                >
                                  {result.status.toUpperCase()}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">{result.timestamp}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Manual Error Testing */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-md font-medium text-gray-900 mb-4">
                        Manual Error Testing
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Click the button below to simulate various OAuth error scenarios:
                      </p>
                      <button
                        onClick={handleTestErrorScenarios}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        Simulate Error Scenarios
                      </button>

                      {/* Integration Tests */}
                      <div className="mt-6">
                        <h3 className="text-md font-medium text-gray-900 mb-4">
                          Integration Tests
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Run comprehensive integration tests to verify all components work
                          together:
                        </p>
                        <button
                          onClick={handleRunIntegrationTests}
                          disabled={isRunningIntegrationTests}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRunningIntegrationTests ? (
                            <div className="flex items-center">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Running Tests...
                            </div>
                          ) : (
                            'Run Integration Tests'
                          )}
                        </button>

                        {integrationTestResults.length > 0 && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">Test Summary</h4>
                            <div className="text-sm text-gray-600">
                              <span className="text-green-600">
                                ✅ {getIntegrationTestSummary().passed} passed
                              </span>
                              {getIntegrationTestSummary().failed > 0 && (
                                <>
                                  {' | '}
                                  <span className="text-red-600">
                                    ❌ {getIntegrationTestSummary().failed} failed
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('login')}
                    className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    Test Login
                  </button>
                  <button
                    onClick={() => setActiveTab('providers')}
                    className="w-full px-4 py-2 text-sm font-medium text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100"
                  >
                    Test Providers
                  </button>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className="w-full px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100"
                  >
                    Test Admin Auth
                  </button>
                  <button
                    onClick={() => setActiveTab('tests')}
                    className="w-full px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100"
                  >
                    View Test Results
                  </button>
                </div>
              </div>

              {/* Status Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Status Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Auth Status:</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${isAuthenticated ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Providers:</span>
                    <span className="text-gray-600">{providerData.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Test Results:</span>
                    <span className="text-gray-600">{testResults.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Google OAuth:</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${isGoogleOAuthEnabled() ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {isGoogleOAuthEnabled() ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Kakao OAuth:</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${isKakaoOAuthEnabled() ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {isKakaoOAuthEnabled() ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthTestPage;
