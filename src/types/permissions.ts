export interface UserPermissions {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  
  // Current mountain role
  currentRole: UserRole;
  
  // Historical roles for audit purposes
  roleHistory: UserRole[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  role: string; // 'admin' | 'butler-offline' | 'butler-online' | 'viewer'
  permissions: string[];
  mountainId: string;
  assignedBy: string;
  assignedAt: Date;
  isActive: boolean;
}

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

export interface PermissionLog {
  userId: string;
  action: 'role-assigned' | 'role-changed' | 'role-suspended';
  oldRole?: string;
  newRole?: string;
  mountainId: string;
  changedBy: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface MountainConfig {
  id: string;
  name: string;
  displayName: string;
  adminUsers: string[];
  defaultRole: string;
}

// Type guards for better type safety
export function isValidRole(role: string): role is 'admin' | 'butler-offline' | 'butler-online' | 'viewer' {
  return ['admin', 'butler-offline', 'butler-online', 'viewer'].includes(role);
}

export function isValidPermission(permission: string): boolean {
  const validPermissions = [
    'manage-cats',
    'manage-posts', 
    'manage-users',
    'view-analytics',
    'manage-settings',
    'export-data'
  ];
  return validPermissions.includes(permission);
}

// Utility types for convenience
export type Role = 'admin' | 'butler-offline' | 'butler-online' | 'viewer';
export type Permission = 'manage-cats' | 'manage-posts' | 'manage-users' | 'view-analytics' | 'manage-settings' | 'export-data';