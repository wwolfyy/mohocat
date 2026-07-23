import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireApiPermission } from '@/lib/auth/requireApiPermission';
import { getRequestMountainId } from '@/lib/tenant';
import type { UserPermissions, UserRole } from '@/types/permissions';

export const dynamic = 'force-dynamic';

// Admin role assignment — Tier 1 write migration (PROJECT_PLAN §7 /
// firebase-sdk-usage-inventory §D). Replaces the client-SDK write path
// (RoleAssignmentService.assignSpecificRole), which could never write its
// `permission_logs` audit entry (rule = `write: if false`, failure swallowed) —
// so every role change was losing its audit trail.
//
// The Admin SDK bypasses Firestore rules, so this route must enforce
// `manage-users` itself. `assignedBy` comes from the verified ID token — never
// from the request body (mirrors /api/account/delete). The user-doc update and
// the audit-log write run in one transaction: no role change without an audit
// entry.

export async function POST(request: Request) {
  const authz = await requireApiPermission(request, 'manage-users');
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  let userId: string;
  let role: string;
  try {
    const body = await request.json();
    userId = body?.userId;
    role = body?.role;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!userId || typeof userId !== 'string' || !role || typeof role !== 'string') {
    return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
  }

  try {
    // Validate against the live role matrix — the same doc requireApiPermission
    // and the Firestore rules resolve against.
    const cfgSnap = await db.collection('role_permissions').doc('role-config').get();
    const roles = (cfgSnap.exists ? cfgSnap.data()?.roles : undefined) ?? {};
    const roleConfig = roles[role];
    if (!roleConfig) {
      return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 });
    }

    const mountainId = getRequestMountainId(request);
    const now = new Date();

    const newRole: UserRole = {
      role,
      permissions: roleConfig.permissions ?? [],
      mountainId,
      assignedBy: authz.uid,
      assignedAt: now,
      isActive: true,
    };

    const userRef = db.collection('users').doc(userId);
    const logRef = db.collection('permission_logs').doc();

    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);

      if (userSnap.exists) {
        const userData = userSnap.data() as UserPermissions;
        const roleHistory = userData.roleHistory || [];
        // Retire only the prior role *on this mountain* — roles on other
        // mountains are untouched. merge:true deep-merges the `roles` map, so
        // setting roles[mountainId] preserves the other keys.
        const priorRole = userData.roles?.[mountainId];
        if (priorRole) {
          roleHistory.push({ ...priorRole, isActive: false });
        }
        tx.set(
          userRef,
          { roles: { [mountainId]: newRole }, roleHistory, updatedAt: now },
          { merge: true }
        );
      } else {
        const newUserPermissions: UserPermissions = {
          uid: userId,
          email: '', // Populated by the login-time profile sync (ensureUserExists)
          roles: { [mountainId]: newRole },
          roleHistory: [],
          createdAt: now,
          updatedAt: now,
        };
        tx.set(userRef, newUserPermissions);
      }

      // Audit entry — previously impossible from the client (`write: if false`).
      tx.set(logRef, {
        userId,
        action: 'role-assigned',
        newRole: role,
        mountainId,
        changedBy: authz.uid,
        timestamp: now,
        metadata: { source: 'admin-interface' },
      });
    });

    return NextResponse.json({ message: 'Role assigned', userId, role });
  } catch (error) {
    console.error('Failed to assign role:', error);
    return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 });
  }
}
