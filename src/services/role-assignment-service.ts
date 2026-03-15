import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { loadPermissionConfig } from '@/config/permission-config';
import type { UserPermissions, UserRole } from '@/types/permissions';

export class RoleAssignmentService {
  private db = getFirestore();
  private config: any = null;

  /**
   * Load permission configuration
   */
  private loadConfig() {
    if (!this.config) {
      this.config = loadPermissionConfig();
    }
    return this.config;
  }

  /**
   * Automatically assign role to user based on email and mountain configuration
   */
  async assignUserRole(
    userId: string,
    email: string,
    mountainId: string = 'geyang'
  ): Promise<void> {
    try {
      const config = this.loadConfig();

      // Check if user is admin for the mountain
      const mountainConfig = config.mountains[mountainId];
      if (!mountainConfig) {
        console.warn(`Mountain ${mountainId} not found in configuration`);
        return;
      }

      let assignedRole = mountainConfig.defaultRole || 'viewer';

      // Check if user is admin
      if (mountainConfig.adminUsers && mountainConfig.adminUsers.includes(email)) {
        assignedRole = 'admin';
      }
      // Check if user is butler-ground
      else if (
        mountainConfig.butlerGroundUsers &&
        mountainConfig.butlerGroundUsers.includes(email)
      ) {
        assignedRole = 'butler-ground';
      }
      // Check if user is butler-internet
      else if (
        mountainConfig.butlerInternetUsers &&
        mountainConfig.butlerInternetUsers.includes(email)
      ) {
        assignedRole = 'butler-internet';
      }

      // Get role permissions
      const roleConfig = config.roles[assignedRole];
      if (!roleConfig) {
        console.error(`Role ${assignedRole} not found in configuration`);
        return;
      }

      const userRole: UserRole = {
        role: assignedRole,
        permissions: roleConfig.permissions,
        mountainId,
        assignedBy: 'system',
        assignedAt: new Date(),
        isActive: true,
      };

      // Create or update user permissions document
      const userRef = doc(this.db, 'user_permissions', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        // Update existing user permissions
        await setDoc(
          userRef,
          {
            email,
            currentRole: userRole,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      } else {
        // Create new user permissions
        const newUserPermissions: UserPermissions = {
          uid: userId,
          email,
          currentRole: userRole,
          roleHistory: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await setDoc(userRef, newUserPermissions);
      }

      console.log(`Assigned role ${assignedRole} to user ${email} for mountain ${mountainId}`);
    } catch (error) {
      console.error('Failed to assign user role:', error);
    }
  }

  /**
   * Manually assign a specific role to a user (for admin use)
   */
  async assignSpecificRole(
    userId: string,
    role: string,
    assignedBy: string,
    mountainId: string = 'geyang'
  ): Promise<void> {
    try {
      const config = await this.loadConfig();

      // Validate role exists
      const roleConfig = config.roles[role];
      if (!roleConfig) {
        throw new Error(`Invalid role: ${role}`);
      }

      const userRole: UserRole = {
        role: role,
        permissions: roleConfig.permissions,
        mountainId,
        assignedBy: assignedBy,
        assignedAt: new Date(),
        isActive: true,
      };

      // Create or update user permissions document
      const userRef = doc(this.db, 'user_permissions', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserPermissions;

        // Add current role to history
        const roleHistory = userData.roleHistory || [];
        if (userData.currentRole) {
          roleHistory.push({
            ...userData.currentRole,
            isActive: false,
          });
        }

        // Update existing user permissions
        await setDoc(
          userRef,
          {
            currentRole: userRole,
            roleHistory: roleHistory,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      } else {
        // Create new user permissions
        const newUserPermissions: UserPermissions = {
          uid: userId,
          email: '', // Will be populated when user logs in
          currentRole: userRole,
          roleHistory: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await setDoc(userRef, newUserPermissions);
      }

      // Log the role assignment
      await this.logRoleChange(userId, role, mountainId, assignedBy);

      console.log(`Assigned role ${role} to user ${userId} for mountain ${mountainId}`);
    } catch (error) {
      console.error('Failed to assign specific role:', error);
      throw error;
    }
  }

  /**
   * Check if user needs role assignment (for new users)
   */
  async needsRoleAssignment(userId: string): Promise<boolean> {
    try {
      const userRef = doc(this.db, 'user_permissions', userId);
      const userDoc = await getDoc(userRef);

      return !userDoc.exists();
    } catch (error) {
      console.error('Error checking role assignment status:', error);
      return false;
    }
  }

  /**
   * Get user's current role
   */
  async getUserRole(userId: string): Promise<string | null> {
    try {
      const userRef = doc(this.db, 'user_permissions', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data() as UserPermissions;
      return userData.currentRole?.role || null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  /**
   * List all available roles
   */
  async getAvailableRoles(): Promise<string[]> {
    try {
      const config = await this.loadConfig();
      return Object.keys(config.roles);
    } catch (error) {
      console.error('Error getting available roles:', error);
      return [];
    }
  }

  /**
   * Log role change for audit purposes
   */
  async logRoleChange(
    userId: string,
    newRole: string,
    mountainId: string,
    changedBy: string
  ): Promise<void> {
    try {
      const { getFirestore, addDoc, collection } = await import('firebase/firestore');
      const db = getFirestore();

      await addDoc(collection(db, 'permission_logs'), {
        userId,
        action: 'role-assigned',
        newRole,
        mountainId,
        changedBy,
        timestamp: new Date(),
        metadata: {
          source: 'admin-interface',
        },
      });
    } catch (error) {
      console.error('Failed to log role change:', error);
      // Don't throw error for logging failure - role assignment should still work
    }
  }

  /**
   * Get role description
   */
  async getRoleDescription(role: string): Promise<string> {
    try {
      const config = await this.loadConfig();
      return config.roles[role]?.description || 'No description available';
    } catch (error) {
      console.error('Error getting role description:', error);
      return 'No description available';
    }
  }
}
