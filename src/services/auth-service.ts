/**
 * Firebase Auth Service Implementation
 *
 * Handles all authentication operations using Firebase Auth.
 * Uses the current mountain's configuration for auth access.
 */

import type { IAuthService, ProviderData } from './interfaces';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithPopup,
  linkWithPopup,
  unlink,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  OAuthProvider,
  User,
  UserCredential
} from 'firebase/auth';
import { auth } from './firebase';
import { getGoogleOAuthConfig, isGoogleOAuthEnabled, isKakaoOAuthEnabled } from '@/utils/config';

export class FirebaseAuthService implements IAuthService {

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw new Error('Failed to sign in');
    }
  }

  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw new Error('Failed to sign out');
    }
  }

  async createUser(email: string, password: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return firebaseOnAuthStateChanged(auth, callback);
  }

  async signInWithGoogle(): Promise<UserCredential> {
    if (!isGoogleOAuthEnabled()) {
      throw new Error('Google OAuth is not enabled');
    }

    try {
      const googleProvider = new GoogleAuthProvider();
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, googleProvider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      
      console.log('Google sign in successful:', {
        isNewUser: additionalUserInfo?.isNewUser,
        providerId: additionalUserInfo?.providerId,
        displayName: result.user.displayName,
        email: result.user.email
      });

      return result;
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      
      // Handle specific Google OAuth errors
      let errorMessage = 'Failed to sign in with Google';
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Google sign-in was cancelled. Please try again.';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Google sign-in request was cancelled. Please wait a moment and try again.';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Google sign-in was blocked by popup blocker. Please disable popup blocker and try again.';
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'An account already exists with this email address. Please sign in using the original method.';
          break;
        default:
          errorMessage = error.message || 'Failed to sign in with Google';
      }
      
      throw new Error(errorMessage);
    }
  }

  async signInWithKakao(): Promise<UserCredential> {
    if (!isKakaoOAuthEnabled()) {
      throw new Error('Kakao OAuth is not enabled');
    }

    try {
      // Create a custom OAuth provider for Kakaotalk
      const kakaoProvider = new OAuthProvider('https://kakao.com');
      kakaoProvider.setCustomParameters({
        // Kakaotalk OAuth parameters
        'client_id': process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID || '',
        'redirect_uri': `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/kakao/callback`,
        'response_type': 'code',
      });

      const result = await signInWithPopup(auth, kakaoProvider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      
      console.log('Kakao sign in successful:', {
        isNewUser: additionalUserInfo?.isNewUser,
        providerId: additionalUserInfo?.providerId,
        displayName: result.user.displayName,
        email: result.user.email
      });

      return result;
    } catch (error: any) {
      console.error('Error signing in with Kakaotalk:', error);
      
      // Handle specific Kakaotalk OAuth errors
      let errorMessage = 'Failed to sign in with Kakaotalk';
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Kakaotalk sign-in was cancelled. Please try again.';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Kakaotalk sign-in request was cancelled. Please wait a moment and try again.';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Kakaotalk sign-in was blocked by popup blocker. Please disable popup blocker and try again.';
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'An account already exists with this email address. Please sign in using the original method.';
          break;
        default:
          errorMessage = error.message || 'Failed to sign in with Kakaotalk';
      }
      
      throw new Error(errorMessage);
    }
  }

  async linkProvider(providerId: string): Promise<UserCredential> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    try {
      let provider;
      if (providerId === 'google.com') {
        provider = new GoogleAuthProvider();
      } else if (providerId === 'https://kakao.com') {
        provider = new OAuthProvider('https://kakao.com');
      } else {
        throw new Error(`Unsupported provider: ${providerId}`);
      }

      const result = await linkWithPopup(user, provider);
      console.log(`Provider ${providerId} linked successfully`);
      return result;
    } catch (error: any) {
      console.error(`Error linking provider ${providerId}:`, error);
      
      let errorMessage = `Failed to link ${providerId} provider`;
      switch (error.code) {
        case 'auth/provider-already-linked':
          errorMessage = `The account is already linked with ${providerId}`;
          break;
        case 'auth/credential-already-in-use':
          errorMessage = 'This credential is already associated with another account';
          break;
        case 'auth/popup-closed-by-user':
          errorMessage = `${providerId} linking was cancelled. Please try again.`;
          break;
        default:
          errorMessage = error.message || `Failed to link ${providerId} provider`;
      }
      
      throw new Error(errorMessage);
    }
  }

  async unlinkProvider(providerId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    try {
      await unlink(user, providerId);
      console.log(`Provider ${providerId} unlinked successfully`);
    } catch (error: any) {
      console.error(`Error unlinking provider ${providerId}:`, error);
      
      let errorMessage = `Failed to unlink ${providerId} provider`;
      switch (error.code) {
        case 'auth/no-such-provider':
          errorMessage = `No ${providerId} provider is linked to this account`;
          break;
        default:
          errorMessage = error.message || `Failed to unlink ${providerId} provider`;
      }
      
      throw new Error(errorMessage);
    }
  }

  async getProviderData(): Promise<ProviderData[]> {
    const user = auth.currentUser;
    if (!user) {
      return [];
    }

    return user.providerData.map(providerData => ({
      providerId: providerData.providerId,
      uid: providerData.uid,
      displayName: providerData.displayName,
      email: providerData.email,
      phoneNumber: providerData.phoneNumber,
      photoURL: providerData.photoURL,
    }));
  }
}
