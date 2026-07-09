/**
 * Server-side permission gate for admin API route handlers (`src/app/api/admin/...`).
 *
 * Admin API routes write via the Firebase Admin SDK, which **bypasses Firestore
 * security rules** — so the route itself must enforce auth + permission. This helper
 * mirrors the `hasPermission` rule (config/firebase/firestore.rules), server-side:
 * verify the caller's Firebase ID token, resolve their role from `users/{uid}`, then
 * check the role's permission set in `role_permissions/role-config` (the same doc the
 * admin Permission Matrix edits).
 *
 * Returns a discriminated result rather than throwing, so each route maps a failure to
 * the right HTTP status without a try/catch dance.
 */
import { auth, db } from '@/lib/firebase-admin';

export type ApiPermissionResult =
  | { ok: true; uid: string }
  | { ok: false; status: number; error: string };

export async function requireApiPermission(
  request: Request,
  permission: string
): Promise<ApiPermissionResult> {
  // 1. Extract the Bearer token.
  const authHeader = request.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    return { ok: false, status: 401, error: 'Authentication required' };
  }

  // 2. Verify the Firebase ID token.
  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(match[1]);
    uid = decoded.uid;
  } catch (error) {
    // Invalid/expired token is an expected auth failure, not a server fault — log and
    // return 401 (mirrors POST /api/contact). Token value is never logged.
    console.error('requireApiPermission: ID token verification failed');
    return { ok: false, status: 401, error: 'Invalid token' };
  }

  // 3. Resolve role -> permissions (Admin SDK reads bypass rules).
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    const currentRole = userSnap.exists ? userSnap.data()?.currentRole : null;
    if (!currentRole || currentRole.isActive === false || !currentRole.role) {
      return { ok: false, status: 403, error: 'Insufficient permissions' };
    }

    const cfgSnap = await db.collection('role_permissions').doc('role-config').get();
    const roles = (cfgSnap.exists ? cfgSnap.data()?.roles : undefined) ?? {};
    const granted: string[] = roles[currentRole.role]?.permissions ?? [];

    if (!granted.includes(permission)) {
      return { ok: false, status: 403, error: 'Insufficient permissions' };
    }

    return { ok: true, uid };
  } catch (error) {
    console.error('requireApiPermission: failed to resolve permissions:', error);
    return { ok: false, status: 500, error: 'Permission check failed' };
  }
}
