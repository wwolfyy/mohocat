'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

/**
 * The two screens a form shows before it can show itself — used by the
 * 공지사항 / 입양홍보 composers when they are **editing** and the post has to be
 * fetched first (2026-08-02).
 *
 * Shared rather than written twice, for the same reason `ui/AsyncStates` exists:
 * "still loading" and "could not load" are the states a surface gets wrong when
 * each one hand-rolls them. These carry the admin-form wording; the public
 * equivalents live in `ui/AsyncStates`.
 */

export const FormLoadingState = () => (
  <div className="flex justify-center items-center py-8" aria-busy="true" aria-live="polite">
    <div className="text-gray-500">불러오는 중...</div>
  </div>
);

export const FormNotFoundState = () => {
  const router = useRouter();

  return (
    <div className="py-8 text-center space-y-4">
      <p className="text-gray-600">게시물을 찾을 수 없습니다.</p>
      <button
        type="button"
        onClick={() => router.push('/admin/posts')}
        className="px-6 py-3 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition-all duration-200"
      >
        목록으로
      </button>
    </div>
  );
};
