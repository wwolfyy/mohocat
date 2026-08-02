'use client';

import React from 'react';
import FeedingSpotsList from '@/components/FeedingSpotsList';
import ButlerStreamClient from '@/components/ButlerStreamClient';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * 급식현황 — gated on `view-post-feeding`. See the sibling 집사톡 page for why
 * this replaced an `isAdmin()` check.
 *
 * 📌 `butler-internet` deliberately does **not** hold `view-post-feeding`, so it
 * sees 집사톡 and not this board. That per-board split is the reason the gate is
 * a specific permission rather than one "is a member" flag.
 */
export default function ButlerStream() {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2">권한을 확인하고 있어요...</p>
      </div>
    );
  }

  if (!hasPermission('view-post-feeding')) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">접근 제한</h1>
        <p className="text-gray-600 mb-4">급식현황은 현장 집사만 볼 수 있어요.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-center text-2xl font-bold mb-4 mx-auto">급식현황</h1>

      <FeedingSpotsList />

      <ButlerStreamClient />
    </div>
  );
}
