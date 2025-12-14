import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, FieldValue, query, where, getDocs } from 'firebase/firestore';
import { loadPermissionConfig, getPermissionMatrix } from '@/config/permission-config';
import type { UserPermissions, UserRole, PermissionLog, PermissionConfig } from '@/types/permissions';

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
    return permissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * Check if user has all specified permissions
   */
  async hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.every(permission => userPermissions.includes(permission));
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    role: string,
    mountainId: string,
    assignedBy: string
  ): Promise<void> {
    const config = await this.loadConfig();

    if (!config.roles[role]) {
      throw new Error(`Invalid role: ${role}`);
    }

    const newRole: UserRole = {
      role,
      // We don't snapshot permissions here anymore to allow dynamic updates
      // OR we snapshot them if we want them tied to assignment time.
      // Given the requirement to "make changes and hit save", dynamic lookup is better.
      // But keeping permissions in UserRole is safer for history.
      // Let's store them but `getUserPermissions` prefers dynamic config if we want instant updates?
      // Actually, standard RBAC usually associates role, and permissions come from role definition.
      // The current UserRole interface has `permissions: string[]`.
      // I will populate it for historical record, but `getUserPermissions` (above) logic
      // might need to decide whether to trust the stored list or the live config.
      // For now, I updated `getUserPermissions` to prefer live config if permissions are empty?
      // Actually, let's stick to RBAC best practice: Role defines permissions.
      // So `getUserPermissions` should ideally check the LIVE config for the user's role.
      // The code above in `getUserPermissions` does exactly that now.
      permissions: config.roles[role].permissions,
      mountainId,
      assignedBy,
      assignedAt: new Date(),
      isActive: true
    };

    const userRef = doc(this.db, this.usersCollection, userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data() as UserPermissions;

      // Deactivate previous role and add to history
      if (userData.currentRole) {
        userData.roleHistory = userData.roleHistory || [];
        userData.roleHistory.push({
          ...userData.currentRole,
          isActive: false
        });
      }

      await updateDoc(userRef, {
        currentRole: newRole,
        roleHistory: userData.roleHistory || [],
        updatedAt: new Date()
      });
    } else {
      // Create new user permissions record
      const newUserPermissions: UserPermissions = {
        uid: userId,
        email: '', // Will be populated later
        currentRole: newRole,
        roleHistory: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(userRef, newUserPermissions);
    }

    // Log the role assignment
    await this.logRoleChange(userId, role, mountainId, assignedBy);
  }

  /**
   * Suspend user role
   */
  async suspendRole(userId: string, suspendedBy: string, reason?: string): Promise<void> {
    const userRef = doc(this.db, this.usersCollection, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data() as UserPermissions;

    // Add current role to history with suspension reason
    userData.roleHistory = userData.roleHistory || [];
    userData.roleHistory.push({
      ...userData.currentRole,
      isActive: false
    });

    // Set current role as inactive
    const suspendedRole = {
      ...userData.currentRole,
      isActive: false
    };

    await updateDoc(userRef, {
      currentRole: suspendedRole,
      roleHistory: userData.roleHistory,
      updatedAt: new Date()
    });

    // Log the suspension
    await this.logRoleChange(
      userId,
      'suspended',
      userData.currentRole.mountainId,
      suspendedBy,
      {
        reason: reason || 'No reason provided',
        previousRole: userData.currentRole.role
      }
    );
  }

  /**
   * Reactivate user role
   */
  async reactivateRole(userId: string, reactivatedBy: string): Promise<void> {
    const userRef = doc(this.db, this.usersCollection, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data() as UserPermissions;

    if (userData.currentRole.isActive) {
      throw new Error('User role is already active');
    }

    // Reactivate the role
    const reactivatedRole = {
      ...userData.currentRole,
      isActive: true
    };

    await updateDoc(userRef, {
      currentRole: reactivatedRole,
      updatedAt: new Date()
    });

    // Log the reactivation
    await this.logRoleChange(
      userId,
      'reactivated',
      userData.currentRole.mountainId,
      reactivatedBy
    );
  }

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
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any as UserPermissions));
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
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any as UserPermissions));
  }

  /**
   * Log role changes for audit trail
   */
  private async logRoleChange(
    userId: string,
    action: string,
    mountainId: string,
    changedBy: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const logEntry: PermissionLog = {
      userId,
      action: action as any,
      newRole: action === 'role-assigned' ? action : undefined,
      mountainId,
      changedBy,
      timestamp: new Date(),
      metadata
    };

    await setDoc(doc(collection(this.db, 'permission_logs')), logEntry);
  }

  /**
   * Get permission logs for a user
   */
  async getUserPermissionLogs(userId: string, limit: number = 50): Promise<PermissionLog[]> {
    const q = query(
      collection(this.db, 'permission_logs'),
      where('userId', '==', userId),
      // orderBy('timestamp', 'desc'),
      // limit(limit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any as PermissionLog));
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
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any as PermissionLog));
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
        updatedAt: timestamp
      };

      if (!userDoc.exists()) {
        // Create new user with default role
        const defaultRole: UserRole = {
          role: 'viewer', // Default role
          permissions: [],
          mountainId: 'default', // Default mountain
          assignedBy: 'system',
          assignedAt: timestamp,
          isActive: true
        };

        const newUser: UserPermissions = {
          ...userData as UserPermissions,
          currentRole: defaultRole,
          roleHistory: [],
          createdAt: timestamp
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
      console.error('Error checking user existence:', error);
      return false;
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
      const providers = providerData.map(p => ({
        providerId: p.providerId,
        uid: p.uid, // The persistent ID from the provider (e.g. Google sub)
        displayName: p.displayName || null,
        email: p.email || null,
        linkedAt: new Date()
      }));

      await updateDoc(userRef, {
        providers: providers,
        updatedAt: new Date()
      });
      console.log(`Updated providers for user ${uid}`);
    } catch (error) {
      console.error('Error updating user providers:', error);
      // Don't throw, just log. Non-critical for auth flow, critical for record keeping.
    }
  }
}