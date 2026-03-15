// Admin authentication and authorization utilities

import { User } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { AdminUser, AdminPermission } from '@/types/admin';
import { PermissionService } from '@/services/permission-service';

/**
 * Check if a user is an admin based on their Firestore permissions
 */
export async function isAdmin(user: User | null): Promise<boolean> {
  if (!user?.uid) return false;

  try {
    const permissionService = new PermissionService();
    const permissions = await permissionService.getUserPermissions(user.uid);

    // Check if user has any admin-level permissions
    const adminPermissions = ['manage-cats', 'manage-posts', 'manage-users', 'manage-settings'];

    return permissions.some((permission) => adminPermissions.includes(permission));
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get user's role from Firestore permissions
 */
export async function getUserRole(user: User | null): Promise<string | null> {
  if (!user?.uid) return null;

  try {
    const permissionService = new PermissionService();
    const permissions = await permissionService.getUserPermissions(user.uid);

    // Determine role based on permissions
    if (permissions.includes('manage-users')) {
      return 'admin';
    } else if (permissions.includes('manage-posts')) {
      return 'butler-internet';
    } else if (permissions.includes('manage-cats')) {
      return 'butler-ground';
    } else if (permissions.length > 0) {
      return 'viewer';
    }

    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Check if user has permission for a specific action on a resource
 */
export async function hasPermission(user: User | null, permission: string): Promise<boolean> {
  if (!user?.uid) return false;

  try {
    const permissionService = new PermissionService();
    return await permissionService.checkPermission(user.uid, permission);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Create admin user object from Firebase user
 */
export async function createAdminUser(user: User): Promise<AdminUser | null> {
  if (!user.uid) return null;

  const isAdminUser = await isAdmin(user);
  if (!isAdminUser) return null;

  const role = await getUserRole(user);
  if (!role) return null;

  const permissionService = new PermissionService();
  const permissions = await permissionService.getUserPermissions(user.uid);

  // Map permission system permissions to admin interface permissions
  const adminPermissions: AdminPermission[] = [];

  permissions.forEach((permission) => {
    switch (permission) {
      case 'manage-cats':
        adminPermissions.push({
          resource: 'cats',
          actions: ['create', 'read', 'update', 'delete'],
        });
        break;
      case 'manage-posts':
        adminPermissions.push({ resource: 'users', actions: ['create', 'read', 'update'] });
        break;
      case 'manage-users':
        adminPermissions.push({
          resource: 'users',
          actions: ['create', 'read', 'update', 'delete'],
        });
        break;
      case 'view-analytics':
        adminPermissions.push({ resource: 'images', actions: ['read'] });
        adminPermissions.push({ resource: 'videos', actions: ['read'] });
        break;
      default:
        break;
    }
  });

  return {
    id: user.uid,
    email: user.email || 'unknown@example.com',
    displayName: user.displayName || undefined,
    role: role as 'admin' | 'moderator',
    lastLogin: new Date(),
    permissions: adminPermissions,
  };
}

/**
 * Admin authentication hook
 */
export async function useAdminAuth(): Promise<AdminUser | null> {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      const adminUser = user ? await createAdminUser(user) : null;
      resolve(adminUser);
      unsubscribe();
    });
  });
}

/**
 * Require admin authentication middleware for API routes
 */
export async function requireAdminAuth(user: User | null): Promise<AdminUser> {
  if (!user) {
    throw new Error('Authentication required');
  }

  const adminUser = await createAdminUser(user);
  if (!adminUser) {
    throw new Error('Admin access required');
  }

  return adminUser;
}

/**
 * Log admin action for audit trail
 */
export function logAdminAction(
  adminUser: AdminUser,
  action: string,
  resource: string,
  resourceId?: string,
  details?: any
) {
  // In production, you might want to store this in Firestore
  // or send to a logging service
  console.log('Admin action:', {
    user: adminUser.email,
    action,
    resource,
    resourceId,
    details,
    timestamp: new Date().toISOString(),
  });
}
