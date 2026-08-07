'use client';

import React from 'react';
import ButlerTalkClient from '@/components/ButlerTalkClient';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * 집사톡 — gated on `view-post-butler`, the permission the roles already carry.
 *
 * 🔑 **This used to gate on `isAdmin()`**, which is why the board was admin-only
 * in practice while `butler-ground` / `butler-internet` held a
 * `view-post-butler` that granted nothing. The nav has always offered the link
 * to those roles — `useResourceAccess` reads the same permission out of
 * `role_permissions/resource-config` — so a member could see the link and then
 * be told 관리자 권한이 필요합니다. The old code said what it meant to do:
 * _"we allow both admin and butler roles"_, directly above
 * `setHasPermission(isAdmin)`.
 */
export default function ButlerTalk() {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2">권한을 확인하고 있어요...</p>
      </div>
    );
  }

  if (!hasPermission('view-post-butler')) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">접근 제한</h1>
        <p className="text-gray-600 mb-4">집사톡은 집사로 등록된 분만 볼 수 있어요.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-center text-2xl font-bold mb-4 mx-auto">집사톡</h1>

      <ButlerTalkClient />
    </div>
  );
}
