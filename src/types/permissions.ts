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
  role: string; // 'admin' | 'butler-ground' | 'butler-internet' | 'viewer'
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
export function isValidRole(role: string): role is 'admin' | 'butler-ground' | 'butler-internet' | 'viewer' {
  return ['admin', 'butler-ground', 'butler-internet', 'viewer'].includes(role);
}

export function isValidPermission(permission: string): boolean {
  const validPermissions = [
    'manage-app',
    'manage-cat',
    'manage-canteen',
    'manage-shelter',
    'manage-photo',
    'manage-video',
    'manage-posts',
    'manage-users',
    'view-post-feeding',
    'view-post-butler',
    'view-photo',
    'view-video'
  ];
  return validPermissions.includes(permission);
}

// Utility types for convenience
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