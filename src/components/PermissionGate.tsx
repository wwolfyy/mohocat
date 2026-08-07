'use client';

import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGateProps {
  /**
   * Any ONE of these admits the visitor.
   *
   * ⚠️ Almost every member-facing gate needs `manage-posts` in the list beside
   * the member permission: an admin holds `manage-posts` and **not** the
   * `write-own-*` grants, so a single-permission gate locks admins out of the
   * page they are most likely to open. (Caught by `admin/butler-create.spec`.)
   */
  permissions: string[];
  /** Korean explanation shown when they do not. */
  deniedMessage: string;
  children: React.ReactNode;
}

/**
 * Client-side gate for a whole page.
 *
 * ⚠️ **This is a UX gate, not a security boundary.** It decides what is worth
 * rendering; the Firestore rules decide what may actually be written, and they
 * are the thing that has to be right. Anything this hides is still reachable by
 * URL — which is exactly the state `/pages/butler_talk/new` and
 * `/pages/butler_stream/new` were in before this existed: no gate of their own,
 * harmless only because the write behind them was denied. Keeping the two in
 * agreement is what stops a member from meeting a composer that cannot save.
 */
export default function PermissionGate({
  permissions,
  deniedMessage,
  children,
}: PermissionGateProps) {
  const { hasAnyPermission, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2">권한을 확인하고 있어요...</p>
      </div>
    );
  }

  if (!hasAnyPermission(permissions)) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">접근 제한</h1>
        <p className="text-gray-600 mb-4">{deniedMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}
