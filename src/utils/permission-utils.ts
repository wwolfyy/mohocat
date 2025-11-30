import { PermissionService } from '@/services/permission-service';

/**
 * Utility function to check if a user has a specific permission
 * Useful for server-side rendering or when hooks are not available
 */
export async function checkUserPermission(userId: string, permission: string): Promise<boolean> {
  const permissionService = new PermissionService();
  return await permissionService.checkPermission(userId, permission);
}

/**
 * Utility function to check if a user has any of the specified permissions
 */
export async function checkUserAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
  const permissionService = new PermissionService();
  return await permissionService.hasAnyPermission(userId, permissions);
}

/**
 * Utility function to check if a user has all specified permissions
 */
export async function checkUserAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
  const permissionService = new PermissionService();
  return await permissionService.hasAllPermissions(userId, permissions);
}

/**
 * Get user's current role
 */
export async function getUserRole(userId: string): Promise<string | null> {
  const permissionService = new PermissionService();
  const permissions = await permissionService.getUserPermissions(userId);
  
  // This is a simplified approach - in a real implementation you might want to
  // store the role separately or have a more sophisticated mapping
  if (permissions.includes('manage-users') && permissions.includes('manage-settings')) {
    return 'admin';
  } else if (permissions.includes('manage-cats')) {
    return 'butler-ground';
  } else if (permissions.includes('manage-posts')) {
    return 'butler-internet';
  } else if (permissions.length === 0) {
    return 'viewer';
  }
  
  return null;
}

/**
 * Get human-readable role name
 */
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    'admin': 'Administrator',
    'butler-ground': 'Butler (Ground)',
    'butler-internet': 'Butler (Internet)',
    'viewer': 'Viewer'
  };
  
  return roleNames[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Get role color for display purposes
 */
export function getRoleColor(role: string): string {
  const roleColors: Record<string, string> = {
    'admin': 'red',
    'butler-ground': 'orange',
    'butler-internet': 'blue',
    'viewer': 'gray'
  };
  
  return roleColors[role] || 'gray';
}

/**
 * Get role permissions
 */
export async function getRolePermissions(role: string): Promise<string[]> {
  const { getRoleDetails } = await import('@/config/permission-config');
  const roleDetails = await getRoleDetails(role);
  return roleDetails?.permissions || [];
}

/**
 * Check if role is valid
 */
export async function isValidRole(role: string): Promise<boolean> {
  const { isValidRole: checkValidRole } = await import('@/config/permission-config');
  return await checkValidRole(role);
}

/**
 * Get all available permissions
 */
export const ALL_PERMISSIONS = [
  'manage-cats',
  'manage-posts',
  'manage-users',
  'view-analytics',
  'manage-settings',
  'export-data'
] as const;

/**
 * Get permissions by category for UI grouping
 */
export const PERMISSION_CATEGORIES = {
  'cats': ['manage-cats'],
  'content': ['manage-posts'],
  'users': ['manage-users'],
  'analytics': ['view-analytics'],
  'settings': ['manage-settings'],
  'data': ['export-data']
} as const;

/**
 * Check if user can access admin features
 */
export async function canAccessAdminPanel(userId: string): Promise<boolean> {
  return await checkUserPermission(userId, 'manage-users');
}

/**
 * Check if user can manage content
 */
export async function canManageContent(userId: string): Promise<boolean> {
  return await checkUserPermission(userId, 'manage-posts');
}

/**
 * Check if user can manage cats
 */
export async function canManageCats(userId: string): Promise<boolean> {
  return await checkUserPermission(userId, 'manage-cats');
}

/**
 * Check if user can view analytics
 */
export async function canViewAnalytics(userId: string): Promise<boolean> {
  return await checkUserPermission(userId, 'view-analytics');
}

/**
 * Get user's effective permissions with caching
 */
const permissionCache = new Map<string, { permissions: string[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getUserPermissionsWithCache(userId: string): Promise<string[]> {
  const cached = permissionCache.get(userId);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.permissions;
  }
  
  const permissionService = new PermissionService();
  const permissions = await permissionService.getUserPermissions(userId);
  
  permissionCache.set(userId, {
    permissions,
    timestamp: Date.now()
  });
  
  return permissions;
}

/**
 * Clear permission cache for a user
 */
export function clearPermissionCache(userId?: string): void {
  if (userId) {
    permissionCache.delete(userId);
  } else {
    permissionCache.clear();
  }
}

// Note: Permission guard for React components would need to be implemented
// as a separate utility that integrates with React hooks
// This is left as a placeholder for future enhancement