export interface UserPermissions {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  emailVerified?: boolean; // Synced from Firebase Auth

  // Active roles, keyed by mountainId — a user can hold a role on several
  // mountains at once, and the host/URL picks which one applies (multi-mountain
  // plan §0 sub-decision 6). A map (not an array) so Firestore rules can do an
  // O(1) key lookup: get(user).data.roles[mountainId].permissions.hasAny([...]).
  roles: Record<string, UserRole>;

  // Historical roles for audit purposes (each carries its own mountainId).
  roleHistory: UserRole[];

  // Signup consent (PIPA). Recorded at account creation so the operator can
  // demonstrate *what* was agreed to, not merely that a box was ticked — each
  // item stores its own policy version (see src/constants/policy.ts).
  //
  // Optional because members created before consent recording shipped
  // (2026-08-01) have no record. Absent ≠ refused: it means "predates the
  // feature". Do not treat a missing value as a compliance signal for those
  // accounts.
  consent?: UserConsent;

  createdAt: Date;
  updatedAt: Date;
}

/** One consent item: when it was given, and to which published version. */
export interface ConsentRecord {
  agreedAt: Date;
  /** POLICY_VERSION at the time of consent, e.g. '2026-07-10'. */
  version: string;
}

export interface UserConsent {
  /** 이용약관 (필수) */
  terms: ConsentRecord;
  /** 개인정보 수집·이용 (필수) */
  privacy: ConsentRecord;
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
  roles: Record<
    string,
    {
      permissions: string[];
      description: string;
    }
  >;
  mountains: Record<
    string,
    {
      name: string;
      adminUsers: string[];
      defaultRole: string;
    }
  >;
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
export function isValidRole(
  role: string
): role is 'admin' | 'butler-ground' | 'butler-internet' | 'viewer' {
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
    'view-video',
    'write-own-post-butler',
    'write-own-post-feeding',
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
  | 'view-video'
  | 'write-own-post-butler'
  | 'write-own-post-feeding';
