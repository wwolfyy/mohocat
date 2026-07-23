import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { loadPermissionConfig } from '@/config/permission-config';
import type { UserPermissions } from '@/types/permissions';

// NOTE (Tier 1 write migration, 2026-07-18): this service no longer writes.
// Role assignment moved to POST /api/admin/assign-role (Admin SDK route behind
// requireApiPermission('manage-users')), which also writes the permission_logs
// audit entry — the client-SDK audit write was rule-denied (`write: if false`)
// and silently swallowed, losing every role change's audit trail. The removed
// client write methods (assignUserRole / assignSpecificRole / logRoleChange)
// must not be reintroduced here. See PROJECT_PLAN §7 /
// docs/planning/firebase-sdk-usage-inventory.md §D.

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
   * Check if user needs role assignment (for new users)
   */
  async needsRoleAssignment(userId: string): Promise<boolean> {
    try {
      const userRef = doc(this.db, 'users', userId);
      const userDoc = await getDoc(userRef);

      return !userDoc.exists();
    } catch (error) {
      console.error('Error checking role assignment status:', error);
      return false;
    }
  }

  /**
   * Get user's role on a given mountain (its `roles[mountainId]`).
   */
  async getUserRole(userId: string, mountainId: string): Promise<string | null> {
    try {
      const userRef = doc(this.db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data() as UserPermissions;
      return userData.roles?.[mountainId]?.role || null;
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
