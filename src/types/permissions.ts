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

/**
 * **The** permission catalogue — every other list is derived from this one.
 *
 * 🔑 It used to live in four places (this guard, the `Permission` union, and a
 * hardcoded array in each of the two admin matrices), which is exactly how the
 * 역할 tab came to be missing `upload-own-*` the day they were added: the code
 * granted them, the rules enforced them, and the UI that manages them had never
 * heard of them (2026-08-03, §10p). **Add a permission here and nowhere else.**
 *
 * ⚠️ `config/permissions.json` and the live `role_permissions/role-config` doc are
 * a *different* axis — which role *holds* what. This is the vocabulary; that is the
 * assignment.
 */
export const ALL_PERMISSIONS = [
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
  // Narrow upload grants (2026-08-03): create a media record attributed to
  // yourself, and nothing else. Deliberately NOT 'manage-photo'/'manage-video',
  // which also authorize retagging and deleting anyone's album entries.
  'upload-own-photo',
  'upload-own-video',
  /**
   * Read the `permission_logs` audit trail. ⚠️ **Enforced by `firestore.rules` and held
   * by no role** — catalogued here 2026-08-03 so it is at least *grantable* from the
   * 역할 matrix; until someone ticks it, the audit log is readable by nobody.
   *
   * 📌 Found by the smoke guard below on its first run, which is the point of it: a
   * rule can require a permission the vocabulary never defined, and that fails
   * **closed and silently** — it presents as "the page shows nothing", never as an
   * error. (The two client readers in `permission-service.ts` have no callers today,
   * so nothing is visibly broken.) Granting it is an owner decision, not a default.
   */
  'view-analytics',
] as const;

/**
 * The subset offerable as a **nav-visibility** gate (the 권한 / resource matrix).
 *
 * 🔑 Deliberately view-only. That matrix answers "which permission does a visitor
 * need to *see* this nav item", so a **write** grant is a category error there —
 * `write-own-post-*` was offered until 2026-08-03, was never selected in live
 * config, and would have gated a link on the ability to post rather than to read.
 */
export const NAV_GATE_PERMISSIONS = [
  'view-post-feeding',
  'view-post-butler',
  'view-photo',
  'view-video',
] as const satisfies readonly Permission[];

export function isValidPermission(permission: string): boolean {
  return (ALL_PERMISSIONS as readonly string[]).includes(permission);
}

// Utility types for convenience
export type Role = 'admin' | 'butler-ground' | 'butler-internet' | 'viewer';
export type Permission = (typeof ALL_PERMISSIONS)[number];
