/**
 * Firebase Auth Service Implementation
 *
 * Handles all authentication operations using Firebase Auth.
 * Uses the current mountain's configuration for auth access.
 */

import type { IAuthService, ProviderData } from './interfaces';
import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithPopup,
  linkWithPopup,
  unlink,
  getAdditionalUserInfo,
  OAuthProvider,
  signInAnonymously,
  User,
  UserCredential,
  EmailAuthProvider,
  linkWithCredential,
  updateProfile,
  sendEmailVerification,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  updatePhoneNumber,
  PhoneAuthProvider
} from 'firebase/auth';
import { auth } from './firebase';
import { getKakaoOAuthConfig, isKakaoOAuthEnabled } from '@/utils/config';

import {
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';

// ... (existing imports)

export class FirebaseAuthService implements IAuthService {
  constructor() {
    // Explicitly set persistence to local to avoid session loss/delays
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Failed to set persistence:', error);
    });
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }
  // ...

  async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw new Error('Failed to sign in');
    }
  }

  async signInWithPhoneNumber(phoneNumber: string, appVerifier: any): Promise<any> {
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      return confirmationResult;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  async confirmPhoneLogin(confirmationResult: any, verificationCode: string): Promise<User> {
    try {
      const result = await confirmationResult.confirm(verificationCode);
      return result.user;
    } catch (error) {
      console.error('Error verifying code:', error);
      throw error;
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



  async signInWithKakao(forceFallback: boolean = false): Promise<UserCredential> {
    if (!isKakaoOAuthEnabled()) {
      throw new Error('Kakao OAuth is not enabled');
    }

    try {
      // Kakaotalk OAuth implementation using OpenID Connect
      // Based on reference guide: https://developers.kakao.com/docs/latest/kakaologin/rest-api

      const config = getKakaoOAuthConfig();
      if (!config) {
        throw new Error('Kakao OAuth configuration not found');
      }

      console.log('=== KAKAOTALK OAUTH DEBUG ===');
      console.log('Kakao OAuth Config:', {
        clientId: config.clientId ? '***HIDDEN***' : 'NOT_SET',
        clientSecret: config.clientSecret ? '***HIDDEN***' : 'NOT_SET',
        enabled: config.enabled
      });
      console.log('Environment Variables:', {
        NEXT_PUBLIC_KAKAO_CLIENT_ID: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID ? '***SET***' : 'NOT_SET',
        NEXT_PUBLIC_KAKAO_CLIENT_SECRET: process.env.NEXT_PUBLIC_KAKAO_CLIENT_SECRET ? '***SET***' : 'NOT_SET',
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL
      });

      // According to reference guide, use 'oidc.kakao' for OpenID Connect
      const kakaoProvider = new OAuthProvider('oidc.kakao');

      console.log('Created OAuthProvider with provider ID: oidc.kakao');

      // Configure OpenID Connect parameters as per reference guide
      // Note: If consent items are not available, use minimal configuration
      // Use Firebase's redirect URI for OpenID Connect
      const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
      const firebaseRedirectUri = firebaseAuthDomain
        ? `https://${firebaseAuthDomain}/__/auth/handler`
        : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/__/auth/handler`;

      /*
      // Removing manual custom parameters to match linkProvider behavior
      // Firebase Console configuration should be sufficient if linking works
      kakaoProvider.setCustomParameters({
        'client_id': config.clientId || '',
        'redirect_uri': firebaseRedirectUri,
        'response_type': 'code',
      });
      */

      console.log('OAuth Provider Configuration:', {
        providerId: kakaoProvider.providerId,
        redirectUri: firebaseRedirectUri,
        clientId: config.clientId ? '***SET***' : '***NOT_SET***',
        clientSecret: config.clientSecret ? '***SET***' : '***NOT_SET***'
      });

      // Note: Only add scopes if they are available in your Kakao Developers application
      // Comment out scopes if getting consent items error
      // kakaoProvider.addScope('profile');
      // kakaoProvider.addScope('account');
      // kakaoProvider.addScope('openid');

      console.log('OAuth Provider Configuration:', {
        providerId: kakaoProvider.providerId
      });

      console.log('Attempting to sign in with KakaoTalk using popup...');
      console.log('OAuth Provider Debug Info:', {
        providerId: kakaoProvider.providerId
      });

      // Add delay to prevent popup blocking issues
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('Opening KakaoTalk popup...');

      const result = await signInWithPopup(auth, kakaoProvider);
      const additionalUserInfo = getAdditionalUserInfo(result);

      console.log('Popup completed successfully, processing result...');

      console.log('=== KAKAOTALK SIGN IN SUCCESS ===');
      console.log('Kakao sign in successful:', {
        isNewUser: additionalUserInfo?.isNewUser,
        providerId: additionalUserInfo?.providerId,
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        uid: result.user.uid
      });

      return result;
    } catch (error: any) {
      console.error('=== KAKAOTALK OAUTH ERROR ===');
      console.error('Initial sign-in attempt failed:', error);
      console.error('Kakaotalk OAuth error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
        customData: error.customData
      });

      // DEBUG: Log the exact error code that should trigger fallback
      console.log('=== DEBUG: ERROR CODE ANALYSIS ===');
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      console.log('Should trigger fallback based on current logic:', this.isKakaoUserCreationError(error));
      console.log('All recognized error codes:', [
        'auth/internal-error',
        'auth/operation-not-allowed'
      ]);
      console.log('=== DEBUG: END ===');

      // Check if this is a user creation error that can be resolved with anonymous user + linking approach
      // OR if fallback is being forced for testing
      const isUserCreationError = forceFallback || this.isKakaoUserCreationError(error);

      if (forceFallback) {
        console.log('=== FORCING FALLBACK APPROACH FOR TESTING ===');
      }

      if (isUserCreationError) {
        console.log('=== FALLING BACK TO ANONYMOUS USER + LINKING APPROACH ===');
        console.log('Detected user creation error, attempting anonymous user creation and linking...');

        try {
          // Step 1: Create anonymous user
          console.log('Creating anonymous user...');
          const anonymousResult = await signInAnonymously(auth);
          console.log('Anonymous user created:', {
            uid: anonymousResult.user.uid,
            isAnonymous: anonymousResult.user.isAnonymous
          });

          // Step 2: Link KakaoTalk account to anonymous user
          console.log('Linking KakaoTalk account to anonymous user...');

          const kakaoProvider = new OAuthProvider('oidc.kakao');
          const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
          const firebaseRedirectUri = firebaseAuthDomain
            ? `https://${firebaseAuthDomain}/__/auth/handler`
            : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/__/auth/handler`;

          // Re-get config for the linking process
          const linkingConfig = getKakaoOAuthConfig();
          if (!linkingConfig) {
            throw new Error('Kakao OAuth configuration not found for linking');
          }

          kakaoProvider.setCustomParameters({
            'client_id': linkingConfig.clientId || '',
            'redirect_uri': firebaseRedirectUri,
            'response_type': 'code',
          });

          const linkingResult = await linkWithPopup(anonymousResult.user, kakaoProvider);
          const additionalUserInfo = getAdditionalUserInfo(linkingResult);

          console.log('=== KAKAOTALK LINKING SUCCESS ===');
          console.log('KakaoTalk account linked successfully:', {
            isNewUser: additionalUserInfo?.isNewUser,
            providerId: additionalUserInfo?.providerId,
            displayName: linkingResult.user.displayName,
            email: linkingResult.user.email,
            photoURL: linkingResult.user.photoURL,
            uid: linkingResult.user.uid,
            providerData: linkingResult.user.providerData
          });

          return linkingResult;
        } catch (linkingError: any) {
          console.error('=== LINKING APPROACH ALSO FAILED ===');
          console.error('Linking error details:', {
            code: linkingError.code,
            message: linkingError.message,
            stack: linkingError.stack
          });

          // Clean up anonymous user if linking failed
          try {
            if (auth.currentUser?.isAnonymous) {
              console.log('Cleaning up anonymous user after failed linking...');
              await auth.currentUser.delete();
            }
          } catch (cleanupError) {
            console.error('Error cleaning up anonymous user:', cleanupError);
          }

          // Throw original error since fallback also failed
          throw new Error(`KakaoTalk authentication failed and fallback approach also failed. Original error: ${error.message}`);
        }
      }

      // Enhanced error handling with specific KakaoTalk issues
      let errorMessage = 'Failed to sign in with Kakaotalk';
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Kakaotalk sign-in was cancelled. This could mean: 1) User closed popup 2) Popup was blocked 3) Authentication completed but result not processed. Please try again.';
          console.error('=== POPUP CLOSED DEBUG ===');
          console.error('Possible causes:');
          console.error('1. User manually closed the popup');
          console.error('2. Popup was blocked by browser security');
          console.error('3. Authentication completed but result processing failed');
          console.error('4. Session already exists - try signing out first');
          console.error('SOLUTION: Try again, disable popup blocker, or sign out and retry');
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Kakaotalk sign-in request was cancelled. Please wait a moment and try again.';
          console.error('=== POPUP REQUEST CANCELLED ===');
          console.error('The popup request was cancelled before completion');
          console.error('This often happens when multiple requests are made simultaneously');
          console.error('SOLUTION: Wait a few seconds and try again');
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Kakaotalk sign-in was blocked by popup blocker. Please disable popup blocker and try again.';
          console.error('=== POPUP BLOCKED ===');
          console.error('Browser popup blocker prevented the authentication popup');
          console.error('SOLUTION: 1) Disable popup blocker 2) Allow popups for this site 3) Try different browser');
          break;
        case 'auth/timeout':
          errorMessage = 'Kakaotalk sign-in timed out. Please check your internet connection and try again.';
          console.error('=== TIMEOUT ERROR ===');
          console.error('Authentication request timed out');
          console.error('SOLUTION: Check internet connection, try again, or use different browser');
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'An account already exists with this email address. Please sign in using the original method.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Kakaotalk sign-in is not enabled in Firebase Console. Please check the authentication providers settings.';
          console.error('FIREBASE SETUP REQUIRED: Enable OpenID Connect provider "oidc.kakao" in Firebase Console > Authentication > Sign-in method');
          break;
        case 'auth/internal-error':
          errorMessage = 'Kakaotalk login failed. Since linking works but login doesn\'t, this suggests a session or flow issue rather than credentials.';
          console.error('=== KAKAOTALK LOGIN VS LINKING DEBUG ===');
          console.error('OBSERVATION: Provider linking works but login fails');
          console.error('This indicates the credentials are correct but there\'s a flow difference');
          console.error('');
          console.error('POSSIBLE CAUSES:');
          console.error('1. Firebase session state conflict - user already authenticated');
          console.error('2. Different OAuth flow behavior between signIn vs link operations');
          console.error('3. OpenID Connect provider configuration issue specific to login flow');
          console.error('4. User already has a Firebase account with different provider');
          console.error('');
          console.error('SOLUTIONS TO TRY:');
          console.error('1. Sign out completely and try fresh login');
          console.error('2. Check if user already exists in Firebase with different email');
          console.error('3. Try creating a new browser profile or incognito mode');
          console.error('4. Verify that the OpenID Connect provider allows new user creation');
          console.error('5. Check Firebase Authentication logs for detailed error information');
          console.error('');
          console.error('DEBUG INFO: The fact that linking works proves credentials are correct.');
          console.error('This is likely a Firebase configuration or session state issue.');
          break;
        case 'auth/invalid-custom-parameter':
          errorMessage = 'Invalid Kakaotalk OAuth configuration. Please check the client ID and redirect URI settings.';
          console.error('CONFIGURATION ERROR: Check environment variables and Firebase provider setup');
          break;
        case 'auth/unsupported-popup-redirect':
          errorMessage = 'Kakaotalk OAuth provider is not properly configured in Firebase Console. Please add OpenID Connect provider with ID "oidc.kakao".';
          console.error('FIREBASE SETUP: Add OpenID Connect provider with ID "oidc.kakao"');
          break;
        default:
          errorMessage = `Kakaotalk authentication failed: ${error.message || 'Unknown error'}`;
          // Check for client credentials error
          if (error.message && (
            error.message.includes('invalid-client') ||
            error.message.includes('Bad client credentials') ||
            error.message.includes('KOE010') ||
            error.message.includes('invalid_credential')
          )) {
            console.error('=== CLIENT CREDENTIALS ERROR DETECTED ===');
            console.error('ERROR: Firebase is sending wrong credentials to KakaoTalk');
            console.error('SOLUTION: Update Firebase OpenID Connect provider configuration');
            console.error('1. CLIENT ID must match your Kakao REST API Key');
            console.error('2. CLIENT SECRET must match your Kakao Client Secret');
            console.error('3. Both must be entered EXACTLY in Firebase Console');
            console.error('4. Check for extra spaces or typos');
          }
          // Check if the error message contains consent-related keywords
          else if (error.message && (
            error.message.includes('동의 항목') ||
            error.message.includes('consent') ||
            error.message.includes('scope') ||
            error.message.includes('openid') ||
            error.message.includes('profile') ||
            error.message.includes('account')
          )) {
            console.error('=== CONSENT ITEMS ERROR DETECTED ===');
            console.error('SOLUTION 1: Enable consent items in Kakao Developers Console');
            console.error('Navigate to: 내 애플리케이션 > 카카오 로그인 > 동의항목');
            console.error('Enable available consent items and save changes');
            console.error('');
            console.error('SOLUTION 2: Use basic login without scopes');
            console.error('The implementation has been updated to work without scopes');
            console.error('This will provide basic authentication with limited user data');
            console.error('Try the login again - it should work with basic authentication');
          }
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Determines if a KakaoTalk authentication error is related to user creation
   * and can be resolved with the anonymous user + linking approach.
   */
  private isKakaoUserCreationError(error: any): boolean {
    if (!error || !error.code) {
      return false;
    }

    // User creation errors that can be resolved with anonymous + linking approach
    const userCreationErrorCodes = [
      'auth/internal-error',           // Often indicates user creation issues
      'auth/operation-not-allowed',    // Could be provider not allowing new user creation
      'auth/account-exists-with-different-credential',  // Account exists with different provider
      'auth/email-already-in-use',     // Email already registered with different provider
      'auth/user-not-found',           // User not found in Firebase but exists in Kakao
      'auth/invalid-credential',       // Credential validation issues that might be resolved with linking
      'auth/user-disabled',            // User account disabled in Firebase
      'auth/wrong-password',           // Password mismatch scenarios
    ];

    // Check for specific error messages that indicate user creation problems
    const userCreationErrorMessages = [
      'user creation',                 // Generic user creation error
      'create user',                   // User creation attempt failed
      'new user',                      // New user creation not allowed
      'sign up',                       // Sign up/registration failed
      'registration',                  // User registration failed
      'account creation',              // Account creation failed
      'user already exists',           // User exists but can't be found/created
      'duplicate user',                // Duplicate user creation attempt
      'credential already linked',     // Credential already linked to another account
      'different credential',          // Account exists with different credential
      'email already in use',          // Email already registered
      'firebase user',                 // Firebase user-related issues
      'provider mismatch',             // Provider configuration mismatch
      'linking failed',                // Previous linking attempts failed
      'authentication failed',         // General authentication failures that might be user-related
    ];

    // Check if error code matches known user creation errors
    if (userCreationErrorCodes.includes(error.code)) {
      console.log('Detected user creation error code:', error.code);
      return true;
    }

    // Check if error message contains user creation indicators
    if (error.message) {
      const lowerMessage = error.message.toLowerCase();
      for (const errorMessage of userCreationErrorMessages) {
        if (lowerMessage.includes(errorMessage)) {
          console.log('Detected user creation error message:', errorMessage);
          return true;
        }
      }
    }

    return false;
  }

  async linkEmailPassword(email: string, password: string): Promise<UserCredential> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    // Force reload to get latest provider data
    await user.reload();

    // Check if Password provider is already linked
    const isPasswordLinked = user.providerData.some(
      (profile) => profile.providerId === EmailAuthProvider.PROVIDER_ID
    );

    if (isPasswordLinked) {
      console.log('User already has email/password provider linked. Skipping link step.');
      // We can't return a UserCredential easily here without re-signing in,
      // but the caller might just need the promise to resolve.
      // We'll return a dummy or cast the current user.
      // Actually, standardizing on returning existing credential is hard without credentials.
      // But for this flow, we just want to avoid the error.
      return { user } as UserCredential;
    }

    try {
      const credential = EmailAuthProvider.credential(email, password);
      const result = await linkWithCredential(user, credential);
      return result;
    } catch (error: any) {
      // Handle race condition where it was linked just now
      if (error.code === 'auth/provider-already-linked') {
        console.log('Caught auth/provider-already-linked race condition. Treating as success.');
        return { user } as UserCredential;
      }
      console.error('Error linking email/password:', error);
      throw error;
    }
  }

  async linkProvider(providerId: string): Promise<UserCredential> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    try {
      let provider;
      if (providerId === 'https://kakao.com' || providerId === 'oidc.kakao') {
        provider = new OAuthProvider('oidc.kakao');
        // Note: Comment out scopes if getting consent items error
        // Only enable these if consent items are available in your Kakao Developers app
        // provider.addScope('profile');
        // provider.addScope('account');
        // provider.addScope('openid');
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
          // Check for consent items error in linking
          if (providerId.includes('kakao') && error.message && (
            error.message.includes('동의 항목') ||
            error.message.includes('consent') ||
            error.message.includes('scope')
          )) {
            console.error('=== KAKAOTALK LINKING CONSENT ERROR ===');
            console.error('Linking failed due to missing consent items');
            console.error('SOLUTION: The implementation has been updated to work without scopes');
            console.error('Try linking again - it should work now with basic authentication');
          }
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

  async updateProfile(displayName?: string, photoURL?: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    try {
      await updateProfile(user, {
        displayName: displayName || undefined,
        photoURL: photoURL || undefined
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw error;
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

  async sendEmailVerification(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    try {
      await sendEmailVerification(user);
    } catch (error: any) {
      console.error('Error sending email verification:', error);
      throw error;
    }
  }

  async reauthenticateWithType(type: 'password' | 'phone', credentialData: any): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    try {
      let credential;
      if (type === 'password') {
        credential = EmailAuthProvider.credential(user.email!, credentialData.password);
        await reauthenticateWithCredential(user, credential);
      } else if (type === 'phone') {
        const verificationId = credentialData.verificationId;
        const verificationCode = credentialData.verificationCode;
        credential = PhoneAuthProvider.credential(verificationId, verificationCode);
        await reauthenticateWithCredential(user, credential);
      }
    } catch (error: any) {
      console.error('Error re-authenticating:', error);
      throw error;
    }
  }

  async verifyBeforeUpdateEmail(newEmail: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    try {
      await verifyBeforeUpdateEmail(user, newEmail);
    } catch (error: any) {
      console.error('Error sending verification for new email:', error);
      throw error;
    }
  }

  async updatePhoneNumber(verificationId: string, verificationCode: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      await updatePhoneNumber(user, credential);
    } catch (error: any) {
      console.error('Error updating phone number:', error);
      throw error;
    }
  }

}
