// Cache for loaded configuration
let configCache: PermissionConfig | null = null;

export interface PermissionConfig {
  roles: Record<string, {
    permissions: string[];
    description: string;
  }>;
  mountains: Record<string, {
    name: string;
    adminUsers: string[];
    defaultRole: string;
  }>;
}

export type Role = 'admin' | 'butler-ground' | 'butler-internet' | 'viewer';
export type Permission =
  | 'manage-app'
  | 'manage-cat'
  | 'manage-canteen'
  | 'manage-shelter'
  | 'manage-photo'
  | 'manage-video'
  | 'manage-posts'
  | 'manage-users'
  | 'view-post-feeding'
  | 'view-post-butler'
  | 'view-photo'
  | 'view-video';

/**
 * Load permission configuration from JSON file
 */
export function loadPermissionConfig(): PermissionConfig {
  // Return cached config if available
  if (configCache) {
    return configCache;
  }

  try {
    // Import the configuration directly as a module
    // This avoids HTTP requests and 404 errors
    const config = require('../../config/permissions.json');

    configCache = config;
    return config;
  } catch (error) {
    console.error('Error loading permission config:', error);
    throw new Error('Failed to load permission configuration');
  }
}

/**
 * Get permission matrix (role -> permissions mapping)
 */
export function getPermissionMatrix(): Record<string, string[]> {
  const config = loadPermissionConfig();
  return Object.fromEntries(
    Object.entries(config.roles).map(([role, data]) => [role, data.permissions])
  );
}

/**
 * Get all available roles
 */
export function getAvailableRoles(): string[] {
  const config = loadPermissionConfig();
  return Object.keys(config.roles);
}

/**
 * Get role details including permissions and description
 */
export function getRoleDetails(role: string): { permissions: string[], description: string } | null {
  const config = loadPermissionConfig();
  const roleData = config.roles[role];

  if (!roleData) {
    return null;
  }

  return {
    permissions: roleData.permissions,
    description: roleData.description
  };
}

/**
 * Check if a role exists
 */
export function isValidRole(role: string): boolean {
  const config = loadPermissionConfig();
  return role in config.roles;
}

/**
 * Get default role for a mountain
 */
export function getDefaultRole(mountainId: string): string {
  const config = loadPermissionConfig();
  const mountain = config.mountains[mountainId];

  if (!mountain) {
    // Return viewer as default if mountain not found
    return 'viewer';
  }

  return mountain.defaultRole || 'viewer';
}

/**
 * Get admin users for a specific mountain
 */
export function getMountainAdminUsers(mountainId: string): string[] {
  const config = loadPermissionConfig();
  const mountain = config.mountains[mountainId];

  return mountain?.adminUsers || [];
}

/**
 * Clear configuration cache (useful for testing or dynamic updates)
 */
export function clearConfigCache(): void {
  configCache = null;
}