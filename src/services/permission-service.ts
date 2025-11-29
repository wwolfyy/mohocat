import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, FieldValue, query, where, getDocs } from 'firebase/firestore';
import { loadPermissionConfig, getPermissionMatrix } from '@/config/permission-config';
import type { UserPermissions, UserRole, PermissionLog, PermissionConfig } from '@/types/permissions';

export class PermissionService {
  private db = getFirestore();
  private config: PermissionConfig | null = null;

  /**
   * Load and cache permission configuration
   */
  private loadConfig(): PermissionConfig {
    if (!this.config) {
      this.config = loadPermissionConfig();
    }
    return this.config;
  }

  /**
   * Get user's effective permissions
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const userDoc = await getDoc(doc(this.db, 'user_permissions', userId));
    if (!userDoc.exists()) {
      return [];
    }
    
    const userData = userDoc.data() as UserPermissions;
    const currentRole = userData.currentRole;
    
    return currentRole.isActive ? currentRole.permissions : [];
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
      permissions: config.roles[role].permissions,
      mountainId,
      assignedBy,
      assignedAt: new Date(),
      isActive: true
    };

    const userRef = doc(this.db, 'user_permissions', userId);
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
    const userRef = doc(this.db, 'user_permissions', userId);
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
    const userRef = doc(this.db, 'user_permissions', userId);
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
    const userDoc = await getDoc(doc(this.db, 'user_permissions', userId));
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
      collection(this.db, 'user_permissions'),
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
      collection(this.db, 'user_permissions'),
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
}