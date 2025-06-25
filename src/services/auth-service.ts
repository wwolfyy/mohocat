/**
 * Firebase Auth Service Implementation
 * 
 * Handles all authentication operations using Firebase Auth.
 * Uses the current mountain's configuration for auth access.
 */

import type { IAuthService } from './interfaces';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged as firebaseOnAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

export class FirebaseAuthService implements IAuthService {
  
  getCurrentUser(): any | null {
    return auth.currentUser;
  }

  async signIn(email: string, password: string): Promise<any> {
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

  onAuthStateChanged(callback: (user: any) => void): () => void {
    return firebaseOnAuthStateChanged(auth, callback);
  }
}
