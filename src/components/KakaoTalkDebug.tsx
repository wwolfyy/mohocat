'use client';

import React, { useState, useEffect } from 'react';
import { getAuthService } from '@/services';
import { getKakaoOAuthConfig } from '@/utils/config';
import { signInWithPopup, OAuthProvider } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { cn } from '@/utils/cn';
import KakaoTalkFallbackDebug from './KakaoTalkFallbackDebug';

interface KakaoTalkDebugProps {
  className?: string;
}

const KakaoTalkDebug: React.FC<KakaoTalkDebugProps> = ({ className }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
    setTestResults(null);
  };

  // Test environment configuration
  const testEnvironment = async () => {
    addLog('🔍 Testing KakaoTalk environment configuration...');

    try {
      // Test environment variables
      const kakaoConfig = getKakaoOAuthConfig();
      addLog(`📋 Kakao OAuth Config found: ${!!kakaoConfig}`);

      if (kakaoConfig) {
        addLog(`✅ Client ID set: ${kakaoConfig.clientId ? 'YES' : 'NO'}`);
        addLog(`✅ Client Secret set: ${kakaoConfig.clientSecret ? 'YES' : 'NO'}`);
        addLog(`✅ OAuth enabled: ${kakaoConfig.enabled}`);
      }

      // Test Firebase auth instance
      addLog(`🔥 Firebase auth instance: ${!!auth}`);
      addLog(`👤 Current user: ${auth.currentUser ? 'SIGNED_IN' : 'NOT SIGNED IN'}`);

      // Test OAuth provider creation
      try {
        const testProvider = new OAuthProvider('oidc.kakao');
        addLog(`✅ OAuthProvider created with ID: ${testProvider.providerId}`);
        addLog(`✅ OAuthProvider created successfully`);
      } catch (error) {
        addLog(`❌ OAuthProvider creation failed: ${error}`);
      }

      setTestResults({
        config: kakaoConfig,
        firebaseAuth: !!auth,
        currentUser: auth.currentUser,
        environment: {
          NEXT_PUBLIC_KAKAO_CLIENT_ID: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID,
          NEXT_PUBLIC_KAKAO_CLIENT_SECRET: process.env.NEXT_PUBLIC_KAKAO_CLIENT_SECRET,
          NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
        },
      });

      addLog('✅ Environment test completed');
    } catch (error) {
      addLog(`❌ Environment test failed: ${error}`);
    }
  };

  // Test KakaoTalk sign-in
  const testKakaoSignIn = async () => {
    if (isTesting) return;

    setIsTesting(true);
    addLog('🚀 Testing KakaoTalk sign-in...');

    try {
      const authService = getAuthService();
      const result = await authService.signInWithKakao();

      addLog(`✅ Sign-in successful!`);
      addLog(`👤 User: ${result.user.displayName || 'No display name'}`);
      addLog(`📧 Email: ${result.user.email || 'No email'}`);
      addLog(`🆔 UID: ${result.user.uid}`);
      addLog(`🆕 Sign-in completed successfully`);
    } catch (error: any) {
      addLog(`❌ Sign-in failed: ${error.message}`);
      addLog(`📋 Error code: ${error.code}`);

      // Provide specific debugging advice
      if (error.code === 'auth/operation-not-allowed') {
        addLog('🔧 DEBUG TIP: Enable OpenID Connect provider "oidc.kakao" in Firebase Console');
      } else if (error.code === 'auth/internal-error') {
        addLog('🔧 DEBUG TIP: Check Firebase OpenID Connect configuration and client credentials');
      } else if (error.code === 'auth/popup-blocked') {
        addLog('🔧 DEBUG TIP: Disable popup blocker and try again');
      }
    } finally {
      setIsTesting(false);
    }
  };

  // Test direct OAuth provider
  const testDirectProvider = async () => {
    addLog('🔗 Testing direct OAuth provider...');

    try {
      const provider = new OAuthProvider('oidc.kakao');
      provider.addScope('profile');
      provider.addScope('account');

      addLog('Attempting direct signIn with popup...');
      const result = await signInWithPopup(auth, provider);

      addLog(`✅ Direct provider test successful!`);
      addLog(`👤 User: ${result.user.displayName || 'No display name'}`);
      addLog(`📧 Email: ${result.user.email || 'No email'}`);
    } catch (error: any) {
      addLog(`❌ Direct provider test failed: ${error.message}`);
      addLog(`📋 Error code: ${error.code}`);
    }
  };

  // Copy logs to clipboard
  const copyLogs = () => {
    const logsText = logs.join('\n');
    navigator.clipboard.writeText(logsText).then(() => {
      addLog('📋 Logs copied to clipboard');
    });
  };

  useEffect(() => {
    // Auto-test environment on mount
    testEnvironment();
  }, []);

  return (
    <div className={cn('max-w-4xl mx-auto p-6 space-y-6', className)}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">KakaoTalk Debug Console</h2>
          <div className="flex space-x-2">
            <button
              onClick={clearLogs}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Clear Logs
            </button>
            <button
              onClick={copyLogs}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Copy Logs
            </button>
          </div>
        </div>

        {/* Test Controls */}
        <div className="space-y-3 mb-6">
          <button
            onClick={testEnvironment}
            className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
          >
            Test Environment
          </button>
          <button
            onClick={testKakaoSignIn}
            disabled={isTesting}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? 'Testing...' : 'Test KakaoTalk Sign-in'}
          </button>
          <button
            onClick={testDirectProvider}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm"
          >
            Test Direct Provider
          </button>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Test Results:</h3>
            <pre className="text-sm text-blue-800 overflow-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}

        {/* Debug Logs */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Debug Logs:</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
            {logs.length === 0 && <div className="text-gray-500">No logs yet...</div>}
          </div>
        </div>

        {/* Debug Instructions */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">Debug Instructions:</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>1. Click &quot;Test Environment&quot; to check configuration</li>
            <li>2. If environment is OK, click &quot;Test KakaoTalk Sign-in&quot;</li>
            <li>3. Review logs for any error messages</li>
            <li>4. Follow debugging tips in the logs</li>
            <li>5. Copy logs and share for troubleshooting help</li>
            <li>
              6. Use the &quot;KakaoTalk Fallback Debug&quot; section below for advanced testing
            </li>
          </ul>
        </div>
      </div>

      {/* Fallback Debug Section */}
      <KakaoTalkFallbackDebug />
    </div>
  );
};

export default KakaoTalkDebug;
