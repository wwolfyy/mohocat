/**
 * POST /api/account/default-role — grant a brand-new member their mountain's
 * default role (`viewer`), once, at signup.
 *
 * WHY THIS IS A SERVER ROUTE. `firestore.rules` lets a signed-in user create their
 * own `users/{uid}` doc only with an EMPTY `roles` map, and update it only while
 * `roles` is unchanged. That invariant is what makes self-escalation impossible —
 * a user physically cannot write a role for themselves. Seeding a default role in
 * the client-side profile sync would therefore be denied outright. So the client
 * still creates the doc with `roles: {}` (rules untouched) and this Admin-SDK
 * route stamps the default afterwards.
 *
 * The Admin SDK bypasses rules, so the guards live here, and they are deliberately
 * narrow — this endpoint is callable by any authenticated user, so it must be
 * incapable of granting anything but the default:
 *
 *   1. The uid comes from the verified ID token, never the body — a caller can
 *      only ever act on themselves.
 *   2. The role is read from `config/permissions.json` for the request mountain
 *      (`defaultRole`), never from the request — the body is ignored entirely.
 *   3. It refuses if `roles[mountainId]` already exists, so it cannot overwrite or
 *      downgrade an admin-assigned role, and re-calling it is a no-op.
 *   4. It writes only `roles[mountainId]`; roles on other mountains are untouched
 *      (merge write, mirroring /api/admin/assign-role).
 *
 * `assignedBy: 'system'` distinguishes an automatic default from an admin grant in
 * the audit trail.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { auth } from '@/lib/firebase-admin';
import { getRequestMountainId } from '@/lib/tenant';
import { loadPermissionConfig } from '@/config/permission-config';
import type { UserPermissions, UserRole } from '@/types/permissions';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // 1. Identify the caller from their own ID token.
  const authHeader = request.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(match[1]);
    uid = decoded.uid;
  } catch {
    console.error('Default-role assignment: ID token verification failed');
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const mountainId = getRequestMountainId(request);

    // 2. The role comes from config, never the caller.
    const config = loadPermissionConfig();
    const defaultRole = config.mountains?.[mountainId]?.defaultRole;
    if (!defaultRole) {
      console.error(`No defaultRole configured for mountain "${mountainId}"`);
      return NextResponse.json({ error: 'No default role configured' }, { status: 500 });
    }

    // Resolve its permissions from the live matrix — the same doc the rules and
    // requireApiPermission read, so a default role can never carry permissions the
    // matrix does not grant it.
    const cfgSnap = await db.collection('role_permissions').doc('role-config').get();
    const roleConfig = (cfgSnap.exists ? cfgSnap.data()?.roles : undefined)?.[defaultRole];
    if (!roleConfig) {
      console.error(`Configured defaultRole "${defaultRole}" is absent from the role matrix`);
      return NextResponse.json({ error: 'Default role not in matrix' }, { status: 500 });
    }

    const now = new Date();
    const userRef = db.collection('users').doc(uid);

    const assigned = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) {
        // The profile sync runs first; nothing to grant a role on yet.
        return false;
      }

      // 3. Never overwrite an existing role on this mountain.
      const userData = snap.data() as UserPermissions;
      if (userData.roles?.[mountainId]) {
        return false;
      }

      const newRole: UserRole = {
        role: defaultRole,
        permissions: roleConfig.permissions ?? [],
        mountainId,
        assignedBy: 'system',
        assignedAt: now,
        isActive: true,
      };

      // 4. merge:true deep-merges `roles`, preserving other mountains' entries.
      tx.set(userRef, { roles: { [mountainId]: newRole }, updatedAt: now }, { merge: true });

      tx.set(db.collection('permission_logs').doc(), {
        userId: uid,
        action: 'role-assigned',
        newRole: defaultRole,
        mountainId,
        changedBy: 'system',
        timestamp: now,
        metadata: { source: 'signup-default' },
      });

      return true;
    });

    return NextResponse.json({ assigned, role: assigned ? defaultRole : null });
  } catch (error) {
    console.error('Failed to assign the default role:', error);
    return NextResponse.json({ error: 'Failed to assign default role' }, { status: 500 });
  }
}
