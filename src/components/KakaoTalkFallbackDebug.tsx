/**
 * Debug component for testing KakaoTalk fallback mechanism
 * This component allows testing the two-step authentication approach
 */

'use client';

import React, { useState } from 'react';
import { FirebaseAuthService } from '@/services/auth-service';

export default function KakaoTalkFallbackDebug() {
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const authService = new FirebaseAuthService();

  const testNormalFlow = async () => {
    setStatus('Testing normal KakaoTalk authentication...');
    setError(null);
    setIsLoading(true);

    try {
      const result = await authService.signInWithKakao(false);
      setStatus('Normal flow succeeded! User ID: ' + result.user.uid);
    } catch (err: any) {
      setStatus('Normal flow failed: ' + err.message);
      setError(err.message);
      console.error('Normal flow error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const testForcedFallback = async () => {
    setStatus('Testing forced fallback mechanism...');
    setError(null);
    setIsLoading(true);

    try {
      const result = await authService.signInWithKakao(true);
      setStatus('Forced fallback succeeded! User ID: ' + result.user.uid);
    } catch (err: any) {
      setStatus('Forced fallback failed: ' + err.message);
      setError(err.message);
      console.error('Forced fallback error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearStatus = () => {
    setStatus('');
    setError(null);
  };

  return (
    <div
      style={{
        padding: '20px',
        border: '2px solid #ff6b6b',
        borderRadius: '8px',
        margin: '20px 0',
        backgroundColor: '#fff5f5',
        fontFamily: 'monospace',
        fontSize: '12px',
      }}
    >
      <h3>🔧 KakaoTalk Fallback Debug Panel</h3>

      <div style={{ marginBottom: '15px' }}>
        <p>
          <strong>Current Status:</strong>
        </p>
        <div
          style={{
            padding: '10px',
            backgroundColor: error ? '#ffebee' : '#e8f5e8',
            border: `2px solid ${error ? '#f44336' : '#4caf50'}`,
            borderRadius: '4px',
            minHeight: '40px',
          }}
        >
          {status || 'Ready to test'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button
          onClick={testNormalFlow}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          Test Normal Flow
        </button>

        <button
          onClick={testForcedFallback}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          Test Forced Fallback
        </button>

        <button
          onClick={clearStatus}
          style={{
            padding: '8px 16px',
            backgroundColor: '#9c27b0',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Clear Status
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#ffebee',
            border: '2px solid #f44336',
            borderRadius: '4px',
            fontFamily: 'monospace',
          }}
        >
          <strong>Error Details:</strong>
          <pre style={{ margin: '5px 0', whiteSpace: 'pre-wrap' }}>{error}</pre>
        </div>
      )}

      <div style={{ marginTop: '15px', fontSize: '11px', color: '#666' }}>
        <h4>📝 Debug Instructions:</h4>
        <ol>
          <li>
            <strong>Normal Flow:</strong> Tests regular KakaoTalk authentication
          </li>
          <li>
            <strong>Forced Fallback:</strong> Forces the two-step approach (anonymous + linking)
          </li>
          <li>Check browser console for detailed error logs</li>
          <li>Look for &quot;=== DEBUG: ERROR CODE ANALYSIS ===&quot; in console logs</li>
          <li>
            Check if &quot;=== FALLING BACK TO ANONYMOUS USER + LINKING APPROACH ===&quot; appears
          </li>
        </ol>

        <h4>🔍 What to Look For:</h4>
        <ul>
          <li>Exact error code in console logs</li>
          <li>Whether fallback mechanism is triggered</li>
          <li>Anonymous user creation success/failure</li>
          <li>Linking success/failure</li>
        </ul>
      </div>
    </div>
  );
}
