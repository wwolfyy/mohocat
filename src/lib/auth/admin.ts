// Admin authentication and authorization utilities

import { User } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { AdminUser } from '@/types/admin';

// Admin user emails - in production, store this in Firestore or environment variables
const ADMIN_EMAILS = [
  'admin@mtcat.com', // Replace with actual admin emails
  'jp@mtcat.com', // Add your email here
  // Add more admin emails as needed
];

// Admin permissions configuration
const ADMIN_PERMISSIONS = {
  admin: {
    images: ['create', 'read', 'update', 'delete'],
    videos: ['create', 'read', 'update', 'delete'],
    cats: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
  },
  moderator: {
    images: ['read', 'update'],
    videos: ['read', 'update'],
    cats: ['read', 'update'],
    users: ['read'],
  },
};

/**
 * Check if a user is an admin based on their email
 */
export function isAdmin(user: User | null): boolean {
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email);
}

/**
 * Get admin user role
 */
export function getAdminRole(email: string): 'admin' | 'moderator' | null {
  if (!ADMIN_EMAILS.includes(email)) return null;

  // For now, all admin emails are 'admin' role
  // In production, you might want to store roles in Firestore
  return 'admin';
}

/**
 * Check if user has permission for a specific action on a resource
 */
export function hasPermission(
  user: User | null,
  resource: string,
  action: string
): boolean {
  if (!user?.email) return false;

  const role = getAdminRole(user.email);
  if (!role) return false;

  const permissions = ADMIN_PERMISSIONS[role];
  const resourcePermissions = permissions[resource as keyof typeof permissions];

  return resourcePermissions?.includes(action as any) || false;
}

/**
 * Create admin user object from Firebase user
 */
export function createAdminUser(user: User): AdminUser | null {
  if (!user.email || !isAdmin(user)) return null;

  const role = getAdminRole(user.email);
  if (!role) return null;

  return {
    id: user.uid,
    email: user.email,
    displayName: user.displayName || undefined,
    role,
    lastLogin: new Date(),
    permissions: Object.entries(ADMIN_PERMISSIONS[role]).map(([resource, actions]) => ({
      resource: resource as any,
      actions: actions as any,
    })),
  };
}

/**
 * Admin authentication hook
 */
export async function useAdminAuth() {
  return new Promise<AdminUser | null>((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      const adminUser = user ? createAdminUser(user) : null;
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

  const adminUser = createAdminUser(user);
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
  console.log('Admin Action:', {
    adminId: adminUser.id,
    adminEmail: adminUser.email,
    action,
    resource,
    resourceId,
    details,
    timestamp: new Date().toISOString(),
  });

  // In production, you might want to store this in Firestore
  // or send to a logging service
}
