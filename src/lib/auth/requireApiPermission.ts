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
 * Multi-mountain: the request's tenant is resolved by Host, and the caller's role is
 * read from `users/{uid}.roles[mountainId]` — a role on a *different* mountain grants
 * nothing here (plan §2.4). The resolved `mountainId` is returned to the route.
 *
 * Returns a discriminated result rather than throwing, so each route maps a failure to
 * the right HTTP status without a try/catch dance.
 *
 * `permission` may be a **list**, which means **any one of** — used where a broad admin
 * grant and a narrow member grant both authorize the same call (the upload routes take
 * `['manage-photo', 'upload-own-photo']`). ⚠️ **Keep the admin permission in the list.**
 * Dropping it locks admins out, because an admin holds only the broad one — the exact
 * bug §10n shipped with `manage-posts` vs `write-own-*`.
 */
import { auth, db } from '@/lib/firebase-admin';
import { getRequestMountainId } from '@/lib/tenant';

export type ApiPermissionResult =
  | { ok: true; uid: string; mountainId: string }
  | { ok: false; status: number; error: string };

export async function requireApiPermission(
  request: Request,
  /** A single permission, or a list meaning **any one of**. */
  permission: string | string[]
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

  // 3. Resolve the request's mountain (by Host) and the caller's role *on that
  //    mountain* -> permissions (Admin SDK reads bypass rules). A role on a
  //    different mountain does not grant access here (multi-mountain plan §2.4).
  const mountainId = getRequestMountainId(request);
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    const role = userSnap.exists ? userSnap.data()?.roles?.[mountainId] : null;
    if (!role || role.isActive === false || !role.role) {
      return { ok: false, status: 403, error: 'Insufficient permissions' };
    }

    const cfgSnap = await db.collection('role_permissions').doc('role-config').get();
    const roles = (cfgSnap.exists ? cfgSnap.data()?.roles : undefined) ?? {};
    const granted: string[] = roles[role.role]?.permissions ?? [];

    const accepted = Array.isArray(permission) ? permission : [permission];
    if (!accepted.some((p) => granted.includes(p))) {
      return { ok: false, status: 403, error: 'Insufficient permissions' };
    }

    return { ok: true, uid, mountainId };
  } catch (error) {
    console.error('requireApiPermission: failed to resolve permissions:', error);
    return { ok: false, status: 500, error: 'Permission check failed' };
  }
}
