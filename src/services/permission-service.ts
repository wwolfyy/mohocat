import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  FieldValue,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { loadPermissionConfig, getPermissionMatrix } from '@/config/permission-config';
import type {
  UserPermissions,
  UserRole,
  PermissionLog,
  PermissionConfig,
} from '@/types/permissions';

export class PermissionService {
  private db = getFirestore();
  private collectionName = 'role_permissions';
  private usersCollection = 'users'; // Migrated from 'user_permissions'
  private config: PermissionConfig | null = null;

  /**
   * Load and cache permission configuration from Firestore
   */
  private async loadConfig(): Promise<PermissionConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const configRef = doc(this.db, 'role_permissions', 'role-config');
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        this.config = configSnap.data() as PermissionConfig;
      } else {
        // Fallback to local config if Firestore is empty
        console.warn('Firestore permission config not found, falling back to local defaults');
        this.config = loadPermissionConfig();
      }
    } catch (error) {
      console.error('Failed to load permission config from Firestore:', error);
      // Fallback to local config on error
      this.config = loadPermissionConfig();
    }

    return this.config!;
  }

  /**
   * Get user's current role
   */
  async getUserRole(userId: string): Promise<string | null> {
    try {
      const userDoc = await getDoc(doc(this.db, this.usersCollection, userId));
      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data() as UserPermissions;
      if (userData.currentRole && userData.currentRole.isActive) {
        return userData.currentRole.role;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }

  /**
   * Get user's effective permissions
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const userDoc = await getDoc(doc(this.db, this.usersCollection, userId));
    if (!userDoc.exists()) {
      return [];
    }

    const userData = userDoc.data() as UserPermissions;
    const currentRole = userData.currentRole;

    if (currentRole.isActive) {
      // If specific permissions are assigned to the user role instance, use them
      if (currentRole.permissions && currentRole.permissions.length > 0) {
        return currentRole.permissions;
      }

      // Otherwise, lookup permissions from the current config for this role
      const config = await this.loadConfig();
      const roleConfig = config.roles[currentRole.role];
      return roleConfig ? roleConfig.permissions : [];
    }

    return [];
  }

  /**
   * Check if user has specific permission
   */
  async checkPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.some((permission) => userPermissions.includes(permission));
  }

  /**
   * Check if user has all specified permissions
   */
  async hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.every((permission) => userPermissions.includes(permission));
  }

  // NOTE (Tier 1 write migration, 2026-07-18): the role-mutation methods that
  // lived here (assignRole / suspendRole / reactivateRole + their private
  // logRoleChange) were caller-less client-SDK write paths whose audit write to
  // `permission_logs` was rule-denied (`write: if false`). Role mutations are
  // now Admin-SDK-only: POST /api/admin/assign-role. Do not reintroduce client
  // writes to `users` role fields or `permission_logs` here. See PROJECT_PLAN §7.

  /**
   * Get user's role history
   */
  async getRoleHistory(userId: string): Promise<UserRole[]> {
    const userDoc = await getDoc(doc(this.db, this.usersCollection, userId));
    if (!userDoc.exists()) {
      return [];
    }

    const userData = userDoc.data() as UserPermissions;
    return userData.roleHistory || [];
  }

  /**
   * Get users with specific role in mountain
   */
  async getUsersByRole(mountainId: string, role: string): Promise<UserPermissions[]> {
    const q = query(
      collection(this.db, this.usersCollection),
      where(`currentRole.mountainId`, '==', mountainId),
      where(`currentRole.role`, '==', role),
      where(`currentRole.isActive`, '==', true)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as any as UserPermissions
    );
  }

  /**
   * Get all users in a mountain
   */
  async getUsersInMountain(mountainId: string): Promise<UserPermissions[]> {
    const q = query(
      collection(this.db, this.usersCollection),
      where(`currentRole.mountainId`, '==', mountainId),
      where(`currentRole.isActive`, '==', true)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as any as UserPermissions
    );
  }

  /**
   * Get permission logs for a user
   */
  async getUserPermissionLogs(userId: string, limit: number = 50): Promise<PermissionLog[]> {
    const q = query(
      collection(this.db, 'permission_logs'),
      where('userId', '==', userId)
      // orderBy('timestamp', 'desc'),
      // limit(limit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as any as PermissionLog
    );
  }

  /**
   * Get all permission logs for audit purposes
   */
  async getAllPermissionLogs(limit: number = 100): Promise<PermissionLog[]> {
    const q = query(
      collection(this.db, 'permission_logs')
      // orderBy('timestamp', 'desc'),
      // limit(limit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as any as PermissionLog
    );
  }

  /**
   * Ensure user exists in the Firestore users collection
   * Creates the user document if it doesn't exist, or updates it if it does.
   */
  async ensureUserExists(user: any): Promise<void> {
    if (!user || !user.uid) return;

    try {
      const userRef = doc(this.db, this.usersCollection, user.uid);
      const userDoc = await getDoc(userRef);

      const timestamp = new Date();

      const userData: Partial<UserPermissions> = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        phoneNumber: user.phoneNumber || '',
        emailVerified: user.emailVerified || false,
        updatedAt: timestamp,
      };

      if (!userDoc.exists()) {
        // Create new user with default role
        const defaultRole: UserRole = {
          role: 'viewer', // Default role
          permissions: [],
          mountainId: 'default', // Default mountain
          assignedBy: 'system',
          assignedAt: timestamp,
          isActive: true,
        };

        const newUser: UserPermissions = {
          ...(userData as UserPermissions),
          currentRole: defaultRole,
          roleHistory: [],
          createdAt: timestamp,
        };

        await setDoc(userRef, newUser);
        console.log(`User document created for ${user.uid}`);
      } else {
        // Update existing user with latest auth data
        // Only update fields that are present in auth user to avoid overwriting exist data with empty
        const updateData: any = { updatedAt: timestamp };
        if (userData.email) updateData.email = userData.email;
        if (userData.displayName) updateData.displayName = userData.displayName;
        if (userData.photoURL) updateData.photoURL = userData.photoURL;
        if (userData.phoneNumber) updateData.phoneNumber = userData.phoneNumber;
        if (userData.emailVerified !== undefined) updateData.emailVerified = userData.emailVerified;

        await updateDoc(userRef, updateData);
        console.log(`User document updated for ${user.uid}`);
      }
    } catch (error) {
      console.error('Error ensuring user exists in Firestore:', error);
      throw error;
    }
  }
  async checkUserExists(uid: string): Promise<boolean> {
    if (!uid) return false;
    try {
      const userRef = doc(this.db, this.usersCollection, uid);
      const userDoc = await getDoc(userRef);
      return userDoc.exists();
    } catch (error) {
      // Re-throw: a failed/blocked/denied read is NOT the same as "user
      // absent". Swallowing to `false` made callers (e.g. LoginForm) treat an
      // unreachable Firestore as a non-existent account and sign the user out.
      // Callers must distinguish a definitive `false` from an unverifiable read.
      console.error('Error checking user existence:', error);
      throw error;
    }
  }

  /**
   * Update user's linked providers in Firestore
   */
  async updateUserProviders(uid: string, providerData: any[]): Promise<void> {
    if (!uid) return;
    try {
      const userRef = doc(this.db, this.usersCollection, uid);
      // We store a simplified version of provider data
      const providers = providerData.map((p) => ({
        providerId: p.providerId,
        uid: p.uid, // The persistent ID from the provider (e.g. Google sub)
        displayName: p.displayName || null,
        email: p.email || null,
        linkedAt: new Date(),
      }));

      await updateDoc(userRef, {
        providers: providers,
        updatedAt: new Date(),
      });
      console.log(`Updated providers for user ${uid}`);
    } catch (error) {
      console.error('Error updating user providers:', error);
      // Don't throw, just log. Non-critical for auth flow, critical for record keeping.
    }
  }
}
