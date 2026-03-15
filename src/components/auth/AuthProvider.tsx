'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  User,
  UserCredential,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  onAuthStateChanged,
} from 'firebase/auth';
import { getAuthService, getPermissionService } from '@/services';
import { auth } from '@/services/firebase'; // Direct access for persistence setting if needed, or better via service
import type { ProviderData } from '@/services/interfaces';

// Auth State Interface
export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  providerData: ProviderData[];
  linkedProviders: string[];
  canLinkKakao: boolean;
  // OAuth operation states
  isSigningInWithKakao: boolean;
  isLinkingKakao: boolean;
  isUnlinkingProvider: boolean;
  // OAuth error states
  kakaoSignInError: string | null;
  linkProviderError: string | null;
  unlinkProviderError: string | null;
  // OAuth success states
  kakaoSignInSuccess: boolean;
  linkProviderSuccess: boolean;
  unlinkProviderSuccess: boolean;
}

// Auth Actions Interface
interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  createUser: (email: string, password: string) => Promise<User>;
  signInWithPhoneNumber: (phoneNumber: string, appVerifier: any) => Promise<any>;
  confirmPhoneLogin: (confirmationResult: any, verificationCode: string) => Promise<User>;
  signOut: () => Promise<void>;
  signInWithKakao: (forceFallback?: boolean) => Promise<void>;
  linkKakaoProvider: () => Promise<void>;
  linkProvider: (providerId: string) => Promise<void>;
  linkEmailPassword: (email: string, password: string) => Promise<void>;
  updateProfile: (displayName?: string, photoURL?: string) => Promise<void>;
  unlinkProvider: (providerId: string) => Promise<void>;
  clearErrors: () => void;
  clearSuccess: () => void;
  sendEmailVerification: () => Promise<void>;
  reauthenticateWithType: (type: 'password' | 'phone', credentialData: any) => Promise<void>;
  verifyBeforeUpdateEmail: (newEmail: string) => Promise<void>;
  updatePhoneNumber: (verificationId: string, verificationCode: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
}

type AuthContextType = AuthState & AuthActions;

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const authService = getAuthService();
  const permissionService = getPermissionService();

  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(!auth.currentUser);
  const [providerData, setProviderData] = useState<ProviderData[]>([]);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);

  // Specific error states
  const [phoneAuthError, setPhoneAuthError] = useState<string | null>(null);

  // OAuth operation states
  const [isSigningInWithKakao, setIsSigningInWithKakao] = useState(false);
  const [isLinkingKakao, setIsLinkingKakao] = useState(false);
  const [isUnlinkingProvider, setIsUnlinkingProvider] = useState(false);

  // OAuth error states
  const [kakaoSignInError, setKakaoSignInError] = useState<string | null>(null);
  const [linkProviderError, setLinkProviderError] = useState<string | null>(null);
  const [unlinkProviderError, setUnlinkProviderError] = useState<string | null>(null);

  // OAuth success states
  const [kakaoSignInSuccess, setKakaoSignInSuccess] = useState(false);
  const [linkProviderSuccess, setLinkProviderSuccess] = useState(false);
  const [unlinkProviderSuccess, setUnlinkProviderSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser: User | null) => {
      if (authUser) {
        setUser(authUser);
        try {
          const providers = await authService.getProviderData();
          setProviderData(providers);
          setLinkedProviders(providers.map((p) => p.providerId));
        } catch (error) {
          console.error('Failed to fetch provider data:', error);
          setProviderData([]);
          setLinkedProviders([]);
        }
      } else {
        setUser(null);
        setProviderData([]);
        setLinkedProviders([]);
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [authService]);

  // Check if providers can be linked
  const canLinkKakao = user !== null && !linkedProviders.includes('https://kakao.com');

  // Clear error states
  const clearErrors = useCallback(() => {
    setKakaoSignInError(null);
    setLinkProviderError(null);
    setUnlinkProviderError(null);
    setPhoneAuthError(null);
  }, []);

  // Clear success states
  const clearSuccess = useCallback(() => {
    setKakaoSignInSuccess(false);
    setLinkProviderSuccess(false);
    setUnlinkProviderSuccess(false);
  }, []);

  // Phone sign-in
  const signInWithPhoneNumber = useCallback(
    async (phoneNumber: string, appVerifier: any) => {
      clearErrors();
      try {
        return await authService.signInWithPhoneNumber(phoneNumber, appVerifier);
      } catch (error: any) {
        setPhoneAuthError(error.message || 'Failed to send SMS code');
        throw error;
      }
    },
    [authService, clearErrors]
  );

  const confirmPhoneLogin = useCallback(
    async (confirmationResult: any, verificationCode: string) => {
      clearErrors();
      try {
        const result = await authService.confirmPhoneLogin(confirmationResult, verificationCode);
        return result;
      } catch (error: any) {
        setPhoneAuthError(error.message || 'Failed to verify code');
        throw error;
      }
    },
    [authService, clearErrors]
  );

  // Email/password sign-in
  const signIn = useCallback(
    async (email: string, password: string) => {
      clearErrors();
      try {
        await authService.signIn(email, password);
      } catch (error: any) {
        console.error(error); // Log error
        throw error;
      }
    },
    [authService, clearErrors]
  );

  // Create user account
  const createUser = useCallback(
    async (email: string, password: string): Promise<User> => {
      clearErrors();
      try {
        const user = await authService.createUser(email, password);
        return user;
      } catch (error: any) {
        console.error(error);
        throw error;
      }
    },
    [authService, clearErrors]
  );

  // Link Email/Password
  const linkEmailPassword = useCallback(
    async (email: string, password: string) => {
      clearErrors();
      try {
        await authService.linkEmailPassword(email, password);
      } catch (error: any) {
        setLinkProviderError(error.message || 'Failed to link email account');
        throw error;
      }
    },
    [authService, clearErrors]
  );

  // Update Profile
  const updateUserProfile = useCallback(
    async (displayName?: string, photoURL?: string) => {
      clearErrors();
      try {
        await authService.updateProfile(displayName, photoURL);
        if (user) {
          const updatedUser = {
            ...user,
            displayName: displayName || user.displayName,
            photoURL: photoURL || user.photoURL,
          };
          // setUser(updatedUser as User); // React updates might happen automatically via onAuthStateChanged or reloading
          // Note: setUser is updated via onAuthStateChanged typically, but we can force it or wait.
          // But for Firestore sync we do:
          await permissionService.ensureUserExists(updatedUser as User); // Cast as User
        }
      } catch (error: any) {
        console.error(error);
        throw error;
      }
    },
    [authService, user, clearErrors, permissionService]
  );

  const updatePhoneNumber = useCallback(
    async (verificationId: string, verificationCode: string) => {
      clearErrors();
      try {
        await authService.updatePhoneNumber(verificationId, verificationCode);
        if (user) {
          await user.reload();
          const currentUser = authService.getCurrentUser();
          if (currentUser) {
            await permissionService.ensureUserExists(currentUser);
            // setUser({ ...currentUser });
          }
        }
      } catch (error: any) {
        console.error(error);
        throw error;
      }
    },
    [authService, user, clearErrors, permissionService]
  );

  // Kakaotalk sign-in
  const signInWithKakao = useCallback(
    async (forceFallback: boolean = false) => {
      if (isSigningInWithKakao) return;

      clearErrors();
      setIsSigningInWithKakao(true);
      setKakaoSignInError(null);

      try {
        await authService.signInWithKakao(forceFallback);
        setKakaoSignInSuccess(true);
        setTimeout(() => setKakaoSignInSuccess(false), 3000);
      } catch (error: any) {
        setKakaoSignInError(error.message || 'Failed to sign in with Kakaotalk');
      } finally {
        setIsSigningInWithKakao(false);
      }
    },
    [authService, isSigningInWithKakao, clearErrors]
  );

  // Link Kakaotalk provider
  const linkKakaoProvider = useCallback(async () => {
    if (isLinkingKakao) return;

    clearErrors();
    setIsLinkingKakao(true);
    setLinkProviderError(null);

    try {
      await authService.linkProvider('https://kakao.com');
      setLinkProviderSuccess(true);
      // Providers should update automatically via useEffect on user change, but user object might not change deep
      // We manually fetch to update state fast
      const providers = await authService.getProviderData();
      setProviderData(providers);
      setLinkedProviders(providers.map((p) => p.providerId));

      if (user) {
        await permissionService.updateUserProviders(user.uid, providers);
      }

      setTimeout(() => setLinkProviderSuccess(false), 3000);
    } catch (error: any) {
      setLinkProviderError(error.message || 'Failed to link Kakaotalk account');
    } finally {
      setIsLinkingKakao(false);
    }
  }, [authService, isLinkingKakao, clearErrors, permissionService, user]);

  // Link provider (generic method)
  const linkProvider = useCallback(
    async (providerId: string) => {
      try {
        await authService.linkProvider(providerId);
        setLinkProviderSuccess(true);

        const providers = await authService.getProviderData();
        setProviderData(providers);
        setLinkedProviders(providers.map((p) => p.providerId));

        if (user) {
          await permissionService.updateUserProviders(user.uid, providers);
        }

        setTimeout(() => setLinkProviderSuccess(false), 3000);
      } catch (error: any) {
        setLinkProviderError(error.message || 'Failed to link provider');
      }
    },
    [authService, permissionService, user]
  );

  // Unlink provider
  const unlinkProvider = useCallback(
    async (providerId: string) => {
      if (isUnlinkingProvider) return;

      clearErrors();
      setIsUnlinkingProvider(true);
      setUnlinkProviderError(null);

      try {
        await authService.unlinkProvider(providerId);
        setUnlinkProviderSuccess(true);

        const providers = await authService.getProviderData();
        setProviderData(providers);
        setLinkedProviders(providers.map((p) => p.providerId));
        setTimeout(() => setUnlinkProviderSuccess(false), 3000);
      } catch (error: any) {
        setUnlinkProviderError(error.message || 'Failed to unlink provider');
      } finally {
        setIsUnlinkingProvider(false);
      }
    },
    [authService, isUnlinkingProvider, clearErrors]
  );

  // Sign out
  const signOut = useCallback(async () => {
    clearErrors();
    try {
      await authService.signOut();
      // State updates handled by onAuthStateChanged
    } catch (error: any) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }, [authService, clearErrors]);

  const sendEmailVerification = useCallback(async () => {
    clearErrors();
    try {
      await authService.sendEmailVerification();
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  }, [authService, clearErrors]);

  const reauthenticateWithType = useCallback(
    async (type: 'password' | 'phone', credentialData: any) => {
      clearErrors();
      try {
        await authService.reauthenticateWithType(type, credentialData);
      } catch (error: any) {
        console.error(error);
        throw error;
      }
    },
    [authService, clearErrors]
  );

  const sendPasswordResetEmail = useCallback(
    async (email: string) => {
      clearErrors();
      try {
        await authService.sendPasswordResetEmail(email);
      } catch (error: any) {
        console.error(error);
        throw error;
      }
    },
    [authService, clearErrors]
  );

  const verifyBeforeUpdateEmail = useCallback(
    async (newEmail: string) => {
      clearErrors();
      try {
        await authService.verifyBeforeUpdateEmail(newEmail);
      } catch (error: any) {
        console.error(error);
        throw error;
      }
    },
    [authService, clearErrors]
  );

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    providerData,
    linkedProviders,
    canLinkKakao,
    isSigningInWithKakao,
    isLinkingKakao,
    isUnlinkingProvider,
    kakaoSignInError: kakaoSignInError || phoneAuthError,
    linkProviderError,
    unlinkProviderError,
    kakaoSignInSuccess,
    linkProviderSuccess,
    unlinkProviderSuccess,
    signIn,
    createUser,
    signInWithPhoneNumber,
    confirmPhoneLogin,
    signOut,
    signInWithKakao,
    linkKakaoProvider,
    linkProvider,
    linkEmailPassword,
    updateProfile: updateUserProfile,
    unlinkProvider,
    clearErrors,
    clearSuccess,
    sendEmailVerification,
    reauthenticateWithType,
    verifyBeforeUpdateEmail,
    updatePhoneNumber,
    sendPasswordResetEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
