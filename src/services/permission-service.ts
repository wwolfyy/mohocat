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
  UserConsent,
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
   * Get user's role on a given mountain (its active `roles[mountainId]`).
   */
  async getUserRole(userId: string, mountainId: string): Promise<string | null> {
    try {
      const userDoc = await getDoc(doc(this.db, this.usersCollection, userId));
      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data() as UserPermissions;
      const role = userData.roles?.[mountainId];
      if (role && role.isActive) {
        return role.role;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }

  /**
   * Get user's effective permissions on a given mountain.
   */
  async getUserPermissions(userId: string, mountainId: string): Promise<string[]> {
    const userDoc = await getDoc(doc(this.db, this.usersCollection, userId));
    if (!userDoc.exists()) {
      return [];
    }

    const userData = userDoc.data() as UserPermissions;
    const role = userData.roles?.[mountainId];

    if (role && role.isActive) {
      // If specific permissions are assigned to the user role instance, use them
      if (role.permissions && role.permissions.length > 0) {
        return role.permissions;
      }

      // Otherwise, lookup permissions from the current config for this role
      const config = await this.loadConfig();
      const roleConfig = config.roles[role.role];
      return roleConfig ? roleConfig.permissions : [];
    }

    return [];
  }

  /**
   * Check if user has a specific permission on a given mountain
   * (`hasPermissionFor` in the plan §2.4).
   */
  async checkPermission(userId: string, permission: string, mountainId: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, mountainId);
    return permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions on a given mountain
   */
  async hasAnyPermission(
    userId: string,
    permissions: string[],
    mountainId: string
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, mountainId);
    return permissions.some((permission) => userPermissions.includes(permission));
  }

  /**
   * Check if user has all specified permissions on a given mountain
   */
  async hasAllPermissions(
    userId: string,
    permissions: string[],
    mountainId: string
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, mountainId);
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
      where(`roles.${mountainId}.role`, '==', role),
      where(`roles.${mountainId}.isActive`, '==', true)
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
      where(`roles.${mountainId}.isActive`, '==', true)
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
  /**
   * Create-or-refresh the caller's own `users/{uid}` profile doc (client SDK —
   * the self-write rule permits it; see firestore.rules `match /users/{userId}`).
   *
   * @param consent Signup consent, passed ONLY by the signup path. It is stamped
   *   on **create** and never on update: an existing record is the original
   *   agreement, and overwriting its timestamp would falsify when consent was
   *   given. A later re-consent (e.g. a policy revision) needs its own flow, not
   *   this one.
   */
  async ensureUserExists(user: any, consent?: UserConsent): Promise<void> {
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
        // Create the profile doc with NO mountain roles — a fresh signup has no
        // permissions on any mountain until an admin assigns one (multi-mountain
        // plan §0 sub-decision 6). Keeping `roles` empty here is also what lets
        // the self-write rule stay a bulletproof "roles must be empty on
        // create / unchanged on update" — a user can never self-grant a role.
        const newUser: UserPermissions = {
          ...(userData as UserPermissions),
          roles: {},
          roleHistory: [],
          createdAt: timestamp,
          ...(consent ? { consent } : {}),
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
