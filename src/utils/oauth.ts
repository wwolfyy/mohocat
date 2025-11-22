/**
 * OAuth Utilities
 *
 * Handles OAuth callback management, state persistence, and error handling
 * for social authentication providers (Google, Kakaotalk).
 */

import { UserCredential } from 'firebase/auth';

export interface OAuthState {
  provider: 'google' | 'kakao';
  redirectUrl?: string;
  timestamp: number;
}

export interface OAuthError {
  code: string;
  message: string;
  provider: string;
  originalError?: any;
}

/**
 * Generate OAuth state for CSRF protection
 */
export function generateOAuthState(provider: 'google' | 'kakao', redirectUrl?: string): string {
  const state: OAuthState = {
    provider,
    redirectUrl: redirectUrl || window.location.pathname,
    timestamp: Date.now(),
  };
  
  // Store state in sessionStorage for callback verification
  const stateKey = `oauth_state_${provider}`;
  sessionStorage.setItem(stateKey, JSON.stringify(state));
  
  return btoa(JSON.stringify(state));
}

/**
 * Verify and parse OAuth state from callback
 */
export function verifyOAuthState(provider: 'google' | 'kakao', state?: string): OAuthState | null {
  if (!state) {
    return null;
  }
  
  try {
    const stateKey = `oauth_state_${provider}`;
    const storedState = sessionStorage.getItem(stateKey);
    const parsedState = JSON.parse(atob(state)) as OAuthState;
    
    // Verify stored state matches callback state
    if (storedState && JSON.parse(storedState) === JSON.stringify(parsedState)) {
      // Clean up stored state
      sessionStorage.removeItem(stateKey);
      return parsedState;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to verify OAuth state:', error);
    return null;
  }
}

/**
 * Handle OAuth success callback
 */
export function handleOAuthSuccess(
  credential: UserCredential, 
  provider: 'google' | 'kakao',
  redirectUrl?: string
): void {
  console.log(`${provider} OAuth successful:`, {
    user: credential.user,
    isNewUser: credential.user.metadata.creationTime === credential.user.metadata.lastSignInTime,
  });
  
  // Clean up OAuth state
  const stateKey = `oauth_state_${provider}`;
  sessionStorage.removeItem(stateKey);
  
  // Redirect to original page or dashboard
  const targetUrl = redirectUrl || '/admin';
  if (typeof window !== 'undefined') {
    window.location.href = targetUrl;
  }
}

/**
 * Handle OAuth error callback
 */
export function handleOAuthError(
  error: any, 
  provider: 'google' | 'kakao'
): OAuthError {
  console.error(`${provider} OAuth error:`, error);
  
  // Clean up OAuth state on error
  const stateKey = `oauth_state_${provider}`;
  sessionStorage.removeItem(stateKey);
  
  const oauthError: OAuthError = {
    code: error.code || 'unknown_error',
    message: error.message || `Failed to authenticate with ${provider}`,
    provider,
    originalError: error,
  };
  
  // Set user-friendly error messages
  switch (error.code) {
    case 'auth/popup-closed-by-user':
      oauthError.message = `${provider} authentication was cancelled.`;
      break;
    case 'auth/cancelled-popup-request':
      oauthError.message = `${provider} authentication request was cancelled. Please wait and try again.`;
      break;
    case 'auth/popup-blocked':
      oauthError.message = `${provider} authentication was blocked. Please disable popup blockers.`;
      break;
    case 'auth/account-exists-with-different-credential':
      oauthError.message = 'An account with this email already exists. Please sign in with the original method.';
      break;
    case 'auth/network-request-failed':
      oauthError.message = 'Network error occurred. Please check your connection and try again.';
      break;
    default:
      oauthError.message = error.message || `Authentication failed with ${provider}.`;
  }
  
  return oauthError;
}

/**
 * Check if OAuth is supported in current environment
 */
export function isOAuthSupported(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.sessionStorage !== 'undefined';
}

/**
 * Get OAuth provider display name
 */
export function getProviderDisplayName(provider: string): string {
  switch (provider) {
    case 'google.com':
      return 'Google';
    case 'https://kakao.com':
      return 'Kakaotalk';
    default:
      return provider;
  }
}

/**
 * Format OAuth error for display to user
 */
export function formatOAuthError(error: OAuthError): string {
  return error.message;
}