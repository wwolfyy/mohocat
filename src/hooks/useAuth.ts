'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { getAuthService } from '@/services';
import type { ProviderData } from '@/services/interfaces';
import { UserCredential } from 'firebase/auth';

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  providerData: ProviderData[];
  linkedProviders: string[];
  canLinkGoogle: boolean;
  canLinkKakao: boolean;
  // OAuth operation states
  isSigningInWithGoogle: boolean;
  isSigningInWithKakao: boolean;
  isLinkingGoogle: boolean;
  isLinkingKakao: boolean;
  isUnlinkingProvider: boolean;
  // OAuth error states
  googleSignInError: string | null;
  kakaoSignInError: string | null;
  linkProviderError: string | null;
  unlinkProviderError: string | null;
  // OAuth success states
  googleSignInSuccess: boolean;
  kakaoSignInSuccess: boolean;
  linkProviderSuccess: boolean;
  unlinkProviderSuccess: boolean;
}

interface UseAuthActions {
  signInWithGoogle: () => Promise<void>;
  signInWithKakao: () => Promise<void>;
  linkGoogleProvider: () => Promise<void>;
  linkKakaoProvider: () => Promise<void>;
  unlinkProvider: (providerId: string) => Promise<void>;
  clearErrors: () => void;
  clearSuccess: () => void;
}

export function useAuth(): AuthState & UseAuthActions {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [providerData, setProviderData] = useState<ProviderData[]>([]);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);

  // OAuth operation states
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false);
  const [isSigningInWithKakao, setIsSigningInWithKakao] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isLinkingKakao, setIsLinkingKakao] = useState(false);
  const [isUnlinkingProvider, setIsUnlinkingProvider] = useState(false);

  // OAuth error states
  const [googleSignInError, setGoogleSignInError] = useState<string | null>(null);
  const [kakaoSignInError, setKakaoSignInError] = useState<string | null>(null);
  const [linkProviderError, setLinkProviderError] = useState<string | null>(null);
  const [unlinkProviderError, setUnlinkProviderError] = useState<string | null>(null);

  // OAuth success states
  const [googleSignInSuccess, setGoogleSignInSuccess] = useState(false);
  const [kakaoSignInSuccess, setKakaoSignInSuccess] = useState(false);
  const [linkProviderSuccess, setLinkProviderSuccess] = useState(false);
  const [unlinkProviderSuccess, setUnlinkProviderSuccess] = useState(false);

  const authService = getAuthService();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (authUser: User | null) => {
      setUser(authUser);
      setLoading(false);
      
      if (authUser) {
        try {
          const providers = await authService.getProviderData();
          setProviderData(providers);
          setLinkedProviders(providers.map(p => p.providerId));
        } catch (error) {
          console.error('Failed to fetch provider data:', error);
          setProviderData([]);
          setLinkedProviders([]);
        }
      } else {
        setProviderData([]);
        setLinkedProviders([]);
      }
    });

    return () => unsubscribe();
  }, [authService]);

  // Check if providers can be linked (user must be signed in and provider not already linked)
  const canLinkGoogle = user !== null && !linkedProviders.includes('google.com');
  const canLinkKakao = user !== null && !linkedProviders.includes('https://kakao.com');

  // Clear error states
  const clearErrors = useCallback(() => {
    setGoogleSignInError(null);
    setKakaoSignInError(null);
    setLinkProviderError(null);
    setUnlinkProviderError(null);
  }, []);

  // Clear success states
  const clearSuccess = useCallback(() => {
    setGoogleSignInSuccess(false);
    setKakaoSignInSuccess(false);
    setLinkProviderSuccess(false);
    setUnlinkProviderSuccess(false);
  }, []);

  // Google sign-in
  const signInWithGoogle = useCallback(async () => {
    if (isSigningInWithGoogle) return;
    
    clearErrors();
    setIsSigningInWithGoogle(true);
    setGoogleSignInError(null);
    
    try {
      await authService.signInWithGoogle();
      setGoogleSignInSuccess(true);
      setTimeout(() => setGoogleSignInSuccess(false), 3000);
    } catch (error: any) {
      setGoogleSignInError(error.message || 'Failed to sign in with Google');
    } finally {
      setIsSigningInWithGoogle(false);
    }
  }, [authService, isSigningInWithGoogle, clearErrors]);

  // Kakaotalk sign-in
  const signInWithKakao = useCallback(async () => {
    if (isSigningInWithKakao) return;
    
    clearErrors();
    setIsSigningInWithKakao(true);
    setKakaoSignInError(null);
    
    try {
      await authService.signInWithKakao();
      setKakaoSignInSuccess(true);
      setTimeout(() => setKakaoSignInSuccess(false), 3000);
    } catch (error: any) {
      setKakaoSignInError(error.message || 'Failed to sign in with Kakaotalk');
    } finally {
      setIsSigningInWithKakao(false);
    }
  }, [authService, isSigningInWithKakao, clearErrors]);

  // Link Google provider
  const linkGoogleProvider = useCallback(async () => {
    if (isLinkingGoogle) return;
    
    clearErrors();
    setIsLinkingGoogle(true);
    setLinkProviderError(null);
    
    try {
      await authService.linkProvider('google.com');
      setLinkProviderSuccess(true);
      // Refresh provider data
      const providers = await authService.getProviderData();
      setProviderData(providers);
      setLinkedProviders(providers.map(p => p.providerId));
      setTimeout(() => setLinkProviderSuccess(false), 3000);
    } catch (error: any) {
      setLinkProviderError(error.message || 'Failed to link Google account');
    } finally {
      setIsLinkingGoogle(false);
    }
  }, [authService, isLinkingGoogle, clearErrors]);

  // Link Kakaotalk provider
  const linkKakaoProvider = useCallback(async () => {
    if (isLinkingKakao) return;
    
    clearErrors();
    setIsLinkingKakao(true);
    setLinkProviderError(null);
    
    try {
      await authService.linkProvider('https://kakao.com');
      setLinkProviderSuccess(true);
      // Refresh provider data
      const providers = await authService.getProviderData();
      setProviderData(providers);
      setLinkedProviders(providers.map(p => p.providerId));
      setTimeout(() => setLinkProviderSuccess(false), 3000);
    } catch (error: any) {
      setLinkProviderError(error.message || 'Failed to link Kakaotalk account');
    } finally {
      setIsLinkingKakao(false);
    }
  }, [authService, isLinkingKakao, clearErrors]);

  // Unlink provider
  const unlinkProvider = useCallback(async (providerId: string) => {
    if (isUnlinkingProvider) return;
    
    clearErrors();
    setIsUnlinkingProvider(true);
    setUnlinkProviderError(null);
    
    try {
      await authService.unlinkProvider(providerId);
      setUnlinkProviderSuccess(true);
      // Refresh provider data
      const providers = await authService.getProviderData();
      setProviderData(providers);
      setLinkedProviders(providers.map(p => p.providerId));
      setTimeout(() => setUnlinkProviderSuccess(false), 3000);
    } catch (error: any) {
      setUnlinkProviderError(error.message || 'Failed to unlink provider');
    } finally {
      setIsUnlinkingProvider(false);
    }
  }, [authService, isUnlinkingProvider, clearErrors]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    providerData,
    linkedProviders,
    canLinkGoogle,
    canLinkKakao,
    // OAuth operation states
    isSigningInWithGoogle,
    isSigningInWithKakao,
    isLinkingGoogle,
    isLinkingKakao,
    isUnlinkingProvider,
    // OAuth error states
    googleSignInError,
    kakaoSignInError,
    linkProviderError,
    unlinkProviderError,
    // OAuth success states
    googleSignInSuccess,
    kakaoSignInSuccess,
    linkProviderSuccess,
    unlinkProviderSuccess,
    // Actions
    signInWithGoogle,
    signInWithKakao,
    linkGoogleProvider,
    linkKakaoProvider,
    unlinkProvider,
    clearErrors,
    clearSuccess,
  };
}
